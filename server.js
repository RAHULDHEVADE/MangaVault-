const express = require("express");
const path = require("path");
const fs = require("fs");
const { Agent } = require("undici");
const { pipeline } = require("stream/promises");
const { Readable, Transform } = require("stream");
const https = require("https");
const http = require("http");
const { execSync, execFileSync, execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);
const { detectSource } = require("./sources/registry");
const imageDispatcher = new Agent({
  connections: 50,
  pipelining: 1,
  connect: { timeout: 15000 },
  headersTimeout: 30000,
  bodyTimeout: 60000
});


// --- Global Paths ---
const uploadsDir = path.join(__dirname, "uploads");
const dbDir = path.join(uploadsDir, "db");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });


// --- Background Job Queue ---
const importQueue = [];
const importJobs = {}; // id -> { id, url, status, message, pages, pdf }
let isProcessingQueue = false;

async function processQueue() {
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  async function queueWorker() {
    while (true) {
      const job = importQueue.shift();
      if (!job) return;

      const state = importJobs[job.id];
      if (!state) continue;

      state.status = "processing";
      state.message = "Downloading pages...";
      console.log("[QUEUE] Starting job:", job.url);

      try {
        const res = await fetch(
          "http://127.0.0.1:" + (process.env.PORT || 3000) + "/api/import",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "Node-Internal-Queue"
            },
            body: JSON.stringify({ url: job.url })
          }
        );

        const data = await res.json();

        if (res.ok && data.success) {
          state.status = "success";
          state.message = data.message;
          state.pages = data.pages;
          state.pdf = data.pdf;
        } else {
          state.status = "error";
          state.message = data.error || "Import failed";
        }
      } catch (err) {
        state.status = "error";
        state.message = "Network error: " + err.message;
      }

      console.log("[QUEUE] Finished job:", job.url, "->", state.status);
    }
  }

  try {
    const chapterWorkers = Math.min(3, importQueue.length);
    await Promise.all(
      Array.from({ length: chapterWorkers }, () => queueWorker())
    );
  } finally {
    isProcessingQueue = false;

    // Catch jobs added while the previous workers were finishing.
    if (importQueue.length > 0) {
      processQueue();
    }
  }
}

// MangaVault URL metadata parser (Step 4 v2)
// Groups by series URL (/manga/<slug>/); chapter number from trailing segment.
function parseSeriesMeta(urlPath) {
  const parts = urlPath.split("/").filter(Boolean);
  const mangaIdx = parts.indexOf("manga");
  let seriesSlug = "unknown";
  let chapterSeg = null;
  if (mangaIdx !== -1 && parts[mangaIdx + 1]) {
    seriesSlug = parts[mangaIdx + 1];
    chapterSeg = parts[mangaIdx + 2] || null;
  }
  const series = seriesSlug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  let chapter = "Chapter";
  if (chapterSeg) {
    const m = chapterSeg.match(/^c?(\d+)/i);
    if (m) chapter = "Chapter " + String(Number(m[1])).padStart(3, "0");
    else chapter = chapterSeg;
  }
  return { series, chapter, seriesKey: "manga/" + seriesSlug };
}



const app = express();

// --- Security: Login & Session ---
const USERNAME = "admin";
const PASSWORD = "mangavault123"; // <--- CHANGE THIS
const SESSION_SECRET = "mangavault_secret_fixed_key_999"; // Permanent Key // Unique on restart

app.use(require("express").json());

// 1. Login route
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  if (username === USERNAME && password === PASSWORD) {
    res.cookie("mangavault_auth", SESSION_SECRET, { maxAge: 30 * 24 * 60 * 60 * 1000, httpOnly: true });
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// 2. Logout route
app.post("/api/logout", (req, res) => {
  res.clearCookie("mangavault_auth");
  res.json({ success: true });
});

// 3. Middleware
app.use((req, res, next) => {
  if (
    req.path === "/api/login" ||
    req.path === "/api/health" ||
    req.path === "/login.html" ||
    req.path.startsWith("/assets/") ||
    req.path.endsWith(".css") ||
    req.path.endsWith(".js") ||
    req.path.endsWith(".png") ||
    req.path.endsWith(".jpg") ||
    req.path.endsWith(".svg") ||
    req.path.startsWith("/uploads/") ||
    (req.headers["user-agent"] || "").includes("Node-Internal-Queue")
  ) {
    return next();
  }
  const cookieHeader = req.headers.cookie || "";
  if (cookieHeader.includes("mangavault_auth=" + SESSION_SECRET)) {
    return next();
  }
  if (req.path.startsWith("/api/")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.redirect("/login.html");
});

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


app.use(express.json());




const PORT = 3000;


const activeImports = new Set();

// Adaptive global download scheduler.
// Maximum 50 active image downloads, distributed by chapter size.
const MAX_ACTIVE_DOWNLOADS = 50;
let activeDownloadCount = 0;
const downloadChapters = new Map();
let dispatchScheduled = false;

function scheduleDownloadDispatch() {
  if (dispatchScheduled) return;
  dispatchScheduled = true;

  // Brief batching window lets concurrently starting chapters register.
  setTimeout(() => {
    dispatchScheduled = false;
    dispatchDownloadSlots();
  }, 25);
}

function dispatchDownloadSlots() {
  while (activeDownloadCount < MAX_ACTIVE_DOWNLOADS) {
    let selected = null;
    let lowestShare = Infinity;

    for (const state of downloadChapters.values()) {
      if (!state.waiters.length || state.active >= state.limit) continue;

      const share = state.active / state.weight;
      if (share < lowestShare) {
        lowestShare = share;
        selected = state;
      }
    }

    if (!selected) break;

    const resolve = selected.waiters.shift();
    selected.active++;
    activeDownloadCount++;
    resolve();
  }

}

function getChapterDownloadWorkers(remainingTasks) {
  return Math.min(15, Math.max(2, Math.ceil(remainingTasks / 4)));
}

function registerDownloadChapter(chapterId, totalPages) {
  downloadChapters.set(chapterId, {
    remainingTasks: totalPages,
    weight: Math.max(1, totalPages),
    limit: getChapterDownloadWorkers(totalPages),
    active: 0,
    waiters: []
  });
  scheduleDownloadDispatch();
}

function markDownloadPageComplete(chapterId) {
  const state = downloadChapters.get(chapterId);
  if (!state) return;

  state.remainingTasks = Math.max(0, state.remainingTasks - 1);
  state.weight = Math.max(1, state.remainingTasks);
  state.limit = getChapterDownloadWorkers(state.remainingTasks);

  // Recalculate allocation immediately after each completed page task.
  dispatchDownloadSlots();
}

function unregisterDownloadChapter(chapterId) {
  downloadChapters.delete(chapterId);
  scheduleDownloadDispatch();
}

async function withDownloadSlot(chapterId, task) {
  const state = downloadChapters.get(chapterId);
  if (!state) {
    throw new Error("Download chapter is not registered: " + chapterId);
  }

  await new Promise(resolve => {
    state.waiters.push(resolve);
    scheduleDownloadDispatch();
  });

  try {
    return await task();
  } finally {
    state.active--;
    activeDownloadCount--;
    dispatchDownloadSlots();
  }
}

app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  // Let /api/* requests bypass static middleware
  if (req.path.startsWith("/api/")) return next();
  return express.static(path.join(__dirname, "public"))(req, res, next);
});

const REFERER = "https://m.mangatown.com/";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

async function fetchUrl(url, options = {}) {
  const MOBILE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://m.mangatown.com/",
    "Connection": "keep-alive"
  };

  try {
    const res = await fetch(url, {
      method: options.method || "GET",
      headers: { ...MOBILE_HEADERS, ...(options.headers || {}) },
      redirect: "follow"
    });

    const buffer = Buffer.from(await res.arrayBuffer());

    return {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      buffer,
      text: buffer.toString("utf8")
    };
  } catch (err) {
    return { status: 0, headers: {}, buffer: Buffer.alloc(0), text: "", error: err.message };
  }
}

function extractImages(html, baseUrl) {
  const matches = [...html.matchAll(/<img\b[^>]*>/gi)];
  const urls = [];
  for (const match of matches) {
    const tag = match[0];
    const srcMatch = tag.match(/(?:src|data-src|data-original)=["']([^"']+)["']/i);
    if (srcMatch) {
      try {
        const full = new URL(srcMatch[1], baseUrl).href;
        if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(full) || /d\d+\.(jpg|jpeg|png|webp)/i.test(full)) {
          urls.push(full);
        }
      } catch (e) {}
    }
  }
  return [...new Set(urls)];
}

function classifyPages(urls) {
  // MangaVault widened strategy v1 (Step 2):
  // - Accepts d001.jpg, p001.jpg, 001.jpg, page-1.jpg, chapter_1_001.webp, etc.
  // - Normalizes output filenames to dNNN.ext so Smart Re-import stays stable.
  // - Ignores common non-content assets (logos, icons, avatars, ads, thumbs).
  // - Dedupes by page number; caps page range to 1..2000.
  const IGNORE = /(?:^|\/)(?:logo|icon|avatar|sprite|banner|ads?|thumb)[^\/]*\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i;
  const FILE_RE = /(?:^|\/)(?:[a-z])?(\d{1,4})\.(jpg|jpeg|png|webp)(?:\?|$)/i;

  const seen = new Set();
  const pages = [];

  for (const url of urls) {
    if (IGNORE.test(url)) continue;

    const match = url.match(FILE_RE);
    if (!match) continue;

    const num = Number(match[1]);
    const ext = match[2].toLowerCase();

    if (!Number.isFinite(num) || num < 1 || num > 2000) continue;
    if (seen.has(num)) continue;
    seen.add(num);

    const filename = "d" + String(num).padStart(3, "0") + "." + ext;

    pages.push({ url, page: num, filename });
  }

  pages.sort((a, b) => a.page - b.page);
  return pages;
}

async function downloadImage(url, savePath, retries = 3, chapterId) {
  for (let i = 1; i <= retries; i++) {
    const tempPath =
      savePath + ".part-" + process.pid + "-" + Date.now() + "-" + i;

    try {
      const result = await withDownloadSlot(chapterId, async () => {
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": REFERER
          },
          redirect: "follow",
          dispatcher: imageDispatcher
        });

        if (res.status !== 200) {
          try { await res.body?.cancel(); } catch (_) {}
          throw new Error("HTTP " + res.status);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.toLowerCase().startsWith("image/")) {
          try { await res.body?.cancel(); } catch (_) {}
          throw new Error("Not an image");
        }

        if (!res.body) {
          throw new Error("Empty response body");
        }

        let bytes = 0;

        const counter = new Transform({
          transform(chunk, encoding, callback) {
            bytes += chunk.length;
            callback(null, chunk);
          }
        });

        await pipeline(
          Readable.fromWeb(res.body),
          counter,
          fs.createWriteStream(tempPath, { flags: "wx" })
        );

        if (bytes < 1000) {
          throw new Error("Too small");
        }

        await fs.promises.rename(tempPath, savePath);

        return { success: true, size: bytes };
      });

      return result;

    } catch (err) {
      try {
        await fs.promises.unlink(tempPath);
      } catch (_) {}

      if (
        err.message.includes("HTTP 403") ||
        err.message.includes("HTTP 404")
      ) {
        return { success: false, error: err.message };
      }

      if (i === retries) {
        return { success: false, error: err.message };
      }

      await new Promise(resolve => setTimeout(resolve, 600 * i));
    }
  }
}

// --- MangaVault: Manga Search & Discovery ---
const MANGATOWN_BASE = "https://m.mangatown.com";

console.log("[DEBUG] Registering /api/search/manga route");
app.get("/api/search/manga", async (req, res) => {
  try {
    const query = String(req.query.q || "").trim();

    if (query.length < 2 || query.length > 100) {
      return res.status(400).json({
        success: false,
        error: "Enter a manga name between 2 and 100 characters."
      });
    }

    const searchUrl = MANGATOWN_BASE + "/search?name=" + encodeURIComponent(query);
    const response = await fetchUrl(searchUrl);

    if (response.status !== 200 || !response.text) {
      return res.status(502).json({
        success: false,
        error: "MangaTown search is temporarily unavailable."
      });
    }

    const html = response.text;
    const results = [];

    const cards = html.match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) || [];

    for (const card of cards) {
      const cover = card.match(
        /<a\b[^>]*class=["'][^"']*\bmanga-cover\b[^"']*["'][^>]*>/i
      );

      if (!cover) continue;

      const href = cover[0].match(/\bhref=["']([^"']+)["']/i);
      const rel = cover[0].match(/\brel=["']([^"']+)["']/i);
      const image = card.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
      const title = card.match(/<p\b[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/p>/i);
      const latest = card.match(
        /<a\b[^>]*class=["'][^"']*\bread-btn\b[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
      );

      if (!href) continue;

      const mangaPath = href[1];

      if (!/^\/manga\/[a-z0-9_-]+\/?$/i.test(mangaPath)) continue;

      const cleanText = value => value
        ? value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&")
            .replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
            .replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()
        : "";

      const mangaTitle = cleanText(title && title[1]) || (rel && cleanText(rel[1]));

      if (!mangaTitle) continue;

      const mangaId = mangaPath.replace(/^\/manga\//, "").replace(/\/$/, "");

      results.push({
        id: mangaId,
        title: mangaTitle,
        url: MANGATOWN_BASE + "/manga/" + mangaId,
        cover: image ? image[1] : null,
        latestChapter: cleanText(latest && latest[1])
      });
    }

    const unique = [...new Map(results.map(item => [item.id, item])).values()];

    res.json({
      success: true,
      query,
      count: unique.length,
      results: unique
    });
  } catch (err) {
    console.error("[MANGA SEARCH]", err.message);
    res.status(500).json({
      success: false,
      error: "Manga search failed."
    });
  }
});

app.get("/api/search/manga/:id/chapters", async (req, res) => {
  try {
    const id = String(req.params.id || "");

    if (!/^[a-z0-9_-]{1,150}$/i.test(id)) {
      return res.status(400).json({ success: false, error: "Invalid manga ID." });
    }

    const seriesUrl = MANGATOWN_BASE + "/manga/" + id;
    const response = await fetchUrl(seriesUrl);

    if (response.status !== 200 || !response.text) {
      return res.status(502).json({
        success: false,
        error: "Could not load this manga's chapter list."
      });
    }

    const html = response.text;
    const licensed = /has been licensed|not available in MangaTown/i.test(html);

    const titleMatch = html.match(
      /<div\b[^>]*class=["']title["'][^>]*>([\s\S]*?)<\/div>/i
    );

    const coverMatch = html.match(
      /<img\b[^>]*class=["']detail-cover["'][^>]*\bsrc=["']([^"']+)["']/i
    );

    const listMatch = html.match(
      /<ul\b[^>]*class=["']detail-ch-list["'][^>]*>([\s\S]*?)<\/ul>/i
    );

    const chapters = [];

    if (!licensed && listMatch) {
      const links = listMatch[1].matchAll(
        /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
      );

      for (const match of links) {
        const chapterPath = match[1];

        if (!/^\/manga\/[a-z0-9_-]+\/c[\w.-]+\/?$/i.test(chapterPath)) {
          continue;
        }

        const content = match[2];
        const label = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const numberMatch = chapterPath.match(/\/c(\d+(?:\.\d+)?)/i);

        if (!numberMatch) continue;

        const dateMatch = content.match(
          /class=["']time["'][^>]*>([\s\S]*?)<\/span>/i
        );

        chapters.push({
          number: Number(numberMatch[1]),
          label: label.split(/\s+/)[0] || ("Chapter " + numberMatch[1]),
          date: dateMatch
            ? dateMatch[1].replace(/<[^>]*>/g, "").trim()
            : "",
          url: new URL(chapterPath, MANGATOWN_BASE).href
        });
      }
    }

    res.json({
      success: true,
      id,
      title: titleMatch
        ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
        : id,
      cover: coverMatch ? coverMatch[1] : null,
      licensed,
      available: !licensed && chapters.length > 0,
      chapterCount: chapters.length,
      chapters
    });
  } catch (err) {
    console.error("[MANGA CHAPTERS]", err.message);
    res.status(500).json({
      success: false,
      error: "Could not retrieve chapters."
    });
  }
});

app.post("/api/search/download", (req, res) => {
  const urls = req.body && req.body.urls;

  if (!Array.isArray(urls) || urls.length === 0 || urls.length > 100) {
    return res.status(400).json({
      success: false,
      error: "Select between 1 and 100 chapters."
    });
  }

  const validUrls = [...new Set(urls.filter(url => {
    if (typeof url !== "string") return false;

    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === "m.mangatown.com" &&
        /^\/manga\/[a-z0-9_-]+\/c[\w.-]+\/?$/i.test(parsed.pathname)
      );
    } catch (_) {
      return false;
    }
  }))];

  if (validUrls.length === 0) {
    return res.status(400).json({
      success: false,
      error: "No valid MangaTown chapter URLs were selected."
    });
  }

  const queued = [];

  for (const url of validUrls) {
    const alreadyQueued = Object.values(importJobs).some(job =>
      job.url.replace(/\/+$/, "") === url.replace(/\/+$/, "") &&
      ["pending", "processing"].includes(job.status)
    );

    if (alreadyQueued) continue;

    const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);

    importJobs[id] = {
      id,
      url,
      status: "pending",
      message: "In queue..."
    };

    importQueue.push({ id, url });
    queued.push(id);
  }

  processQueue();

  res.json({
    success: true,
    queued: queued.length,
    skipped: validUrls.length - queued.length,
    jobs: queued
  });
});
// --- End Manga Search & Discovery ---

app.get("/api/health", (req, res) => {
  res.json({ status: "online", app: "MangaVault" });
});

app.post("/api/import", async (req, res) => {
  const url = (req.body && req.body.url) || "";

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Chapter URL is required" });
  }

  if (!url.includes("mangatown.com")) {
    return res.status(400).json({ error: "Currently only MangaTown URLs are supported" });
  }

  const importKey = url.trim().replace(/\/+$/, "");
  if (activeImports.has(importKey)) {
    return res.status(409).json({
      error: "This chapter is already being imported. Please wait."
    });
  }

  activeImports.add(importKey);
  console.log("\n[IMPORT] Starting:", url);

  try {
    // 1. Detect source and normalize URL (fix slashes)
    const source = detectSource(url);
    if (!source) return res.status(400).json({ error: "Unsupported source", code: "UNSUPPORTED_SOURCE" });

    let finalUrl = source.normalizeUrl ? source.normalizeUrl(url) : url;
    console.log("[IMPORT] Starting normalized URL:", finalUrl);

    // 2. Fetch the page
    let page = await fetchUrl(finalUrl);

    // 3. Extract page refs
    let result = source.extractPageRefs(page.text, finalUrl);
    let pages = result.pages;

    // 4. If 0 pages and adapter gave a retryUrl, try again
    if (pages.length === 0 && result.retryUrl) {
      console.log("[IMPORT] 0 pages. Adapter suggested retry:", result.retryUrl);
      const retryPage = await fetchUrl(result.retryUrl);
      if (retryPage.status === 200) {
        result = source.extractPageRefs(retryPage.text, result.retryUrl);
        pages = result.pages;
        finalUrl = result.retryUrl;
      }
    }

    // 5. Final check
    if (pages.length === 0) {
      return res.status(400).json({ error: "No page images found on this chapter" });
    }

    console.log("[IMPORT] Found " + pages.length + " expected pages");

    // Reuse the existing folder for this exact chapter URL.
    const normalizedUrl = new URL(finalUrl).href.replace(/\/+$/, "");
const dbDir = path.join(uploadsDir, "db");
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    let folderName = null;
    let previousManifest = null;

    // Find an existing manifest for this exact URL
    if (fs.existsSync(dbDir)) {
      for (const file of fs.readdirSync(dbDir)) {
        if (!file.endsWith(".json")) continue;
        const manifestPath = path.join(dbDir, file);
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          if (manifest.source === normalizedUrl) {
            // Check if the PDF actually exists
            const pdfName = path.basename(manifest.pdf || "");
            const pdfPath = path.join(uploadsDir, pdfName);
            if (pdfName && fs.existsSync(pdfPath)) {
              previousManifest = manifest;
              folderName = file.replace(/\.json$/, "");
              console.log("[IMPORT] Found existing chapter, skipping download");
              break;
            }
          }
        } catch (e) { /* skip bad json */ }
      }
    }

    // If this chapter is already fully downloaded, skip it
    if (previousManifest) {
      return res.json({
        success: true,
        message: "Chapter already exists. Skipped.",
        pdf: previousManifest.pdf,
        pages: previousManifest.downloaded || 0,
        total: previousManifest.totalPages || 0
      });
    }

    if (!folderName) folderName = "chapter_" + Date.now();    if (!folderName) folderName = "chapter_" + Date.now();

    const imageDir = path.join(uploadsDir, folderName);
    fs.mkdirSync(imageDir, { recursive: true });

    let ok = 0;
    const failedPages = [];

    const downloadStageStart = Date.now();

    // Chapter-specific worker cap based on expected page count.
    const DOWNLOAD_CONCURRENCY = getChapterDownloadWorkers(pages.length);
    let nextPageIndex = 0;

    async function downloadWorker() {
      while (true) {
        const index = nextPageIndex++;
        if (index >= pages.length) return;

        const page = pages[index];
        const savePath = path.join(imageDir, page.filename);

        try {
          if (fs.existsSync(savePath) && fs.statSync(savePath).size >= 1000) {
            ok++;
            page.status = "downloaded";
            page.size = fs.statSync(savePath).size;
            console.log("[IMPORT] Already have " + page.filename + " — skipped");
            continue;
          }

          console.log("[IMPORT] Downloading missing page: " + page.filename);

          const result = await downloadImage(page.url, savePath, 3, importKey);

          if (result.success) {
            ok++;
            page.status = "downloaded";
            page.size = result.size;
          } else {
            page.status = "failed";
            page.error = result.error;
            failedPages.push(page.filename);
            console.log("[IMPORT] Failed " + page.filename + ": " + result.error);
          }
        } catch (err) {
          page.status = "failed";
          page.error = err.message;
          failedPages.push(page.filename);
          console.log("[IMPORT] Failed " + page.filename + ": " + err.message);
        } finally {
          markDownloadPageComplete(importKey);
        }
      }
    }

    const workerCount = Math.min(DOWNLOAD_CONCURRENCY, pages.length);
    registerDownloadChapter(importKey, pages.length);

    try {
      await Promise.all(
        Array.from({ length: workerCount }, () => downloadWorker())
      );
    } finally {
      unregisterDownloadChapter(importKey);
    }

    console.log(
      "[TIMING] Image downloads: " +
      ((Date.now() - downloadStageStart) / 1000).toFixed(2) +
      "s (" + ok + "/" + pages.length + " pages)"
    );

    const pdfName = previousManifest?.pdf
      ? path.basename(previousManifest.pdf)
      : folderName + ".pdf";

    const pdfPath = path.join(uploadsDir, pdfName);
    const relativePdf = "/uploads/" + pdfName;

    // Save progress, but never replace an existing PDF while pages are missing.
    if (ok !== pages.length) {
      const partialManifest = {
        ...(previousManifest || {}),
        source: finalUrl,
        totalPages: pages.length,
        downloaded: ok,
        failedPages,
        imageDir: folderName,
        pdf: previousManifest?.pdf || null,
        updatedAt: new Date().toISOString()
      };

      fs.writeFileSync(
        path.join(imageDir, "manifest.json"),
        JSON.stringify(partialManifest, null, 2)
      );

      return res.status(206).json({
        success: false,
        incomplete: true,
        message: "Some pages are still missing. Existing PDF has been preserved.",
        downloaded: ok,
        total: pages.length,
        missing: failedPages
      });
    }

    // Generate and verify PDF asynchronously.
    const tempPdfPath = pdfPath + ".recovery.tmp.pdf";

    try {
      const generationStart = Date.now();

      await execFileAsync(
        "python3",
        ["diagnostics/make-pdf.py", imageDir, tempPdfPath],
        { timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
      );

      console.log(
        "[IMPORT] PDF generation completed in " +
        ((Date.now() - generationStart) / 1000).toFixed(2) + "s"
      );

      // Independently verify the PDF before replacing the previous one.
      const verification = await execFileAsync(
        "python3",
        [
          "-c",
          "import sys; from pypdf import PdfReader; print(len(PdfReader(sys.argv[1]).pages))",
          tempPdfPath
        ],
        { timeout: 30000, maxBuffer: 1024 * 1024 }
      );

      const actualCount = Number(verification.stdout.trim());

      if (
        !Number.isFinite(actualCount) ||
        actualCount < 1 ||
        actualCount > pages.length
      ) {
        throw new Error(
          "PDF verification failed: expected at most " +
          pages.length + ", found " + actualCount
        );
      }

      console.log(
        "[IMPORT] PDF verified (" + actualCount +
        " physical pages, " + pages.length + " source images)"
      );

      // Atomically replace the previous PDF only after verification.
      await fs.promises.rename(tempPdfPath, pdfPath);

    } catch (err) {
      try {
        await fs.promises.unlink(tempPdfPath);
      } catch (_) {}

      console.error(
        "[IMPORT] PDF verification/generation failed:",
        err.message
      );

      return res.status(500).json({
        error: "PDF verification failed. Previous PDF was preserved."
      });
    }

    // Extract and maintain the best available series cover.
    const sourceParts = new URL(url).pathname.split("/").filter(Boolean);
    const seriesSlug = (sourceParts[sourceParts.length - 2] || "unknown-manga")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-");

    const chapterSegment = sourceParts[sourceParts.length - 1] || "";
    const chapterMatch = chapterSegment.match(/c(\d+)/i);
    const chapterNumber = chapterMatch ? Number(chapterMatch[1]) : null;

    const firstPage = pages.find(p => p.page === 1 && p.status === "downloaded")
      || pages.find(p => p.status === "downloaded");

    let coverRelative = null;

    if (firstPage) {
      const seriesDir = path.join(__dirname, "uploads", "series", seriesSlug);
      fs.mkdirSync(seriesDir, { recursive: true });

      const coverMetaPath = path.join(seriesDir, "series.json");
      const existingCoverPath = path.join(seriesDir, "cover" + path.extname(firstPage.filename));

      let existingMeta = {};
      if (fs.existsSync(coverMetaPath)) {
        try {
          existingMeta = JSON.parse(fs.readFileSync(coverMetaPath, "utf8"));
        } catch (_) {}
      }

      const existingCover = existingMeta.cover;
      const existingChapter = Number(existingMeta.coverChapterNumber);
      const coverFileMissing =
        !existingCover ||
        !fs.existsSync(path.join(seriesDir, path.basename(existingCover)));

      // Cover policy: always lock to the LOWEST chapter number.
      // Chapter 001 wins forever. Newer chapters never overwrite it.
      const newChapterIsLower =
        chapterNumber !== null &&
        Number.isFinite(chapterNumber) &&
        (!Number.isFinite(existingChapter) || chapterNumber < existingChapter);

      const shouldUpdateCover = coverFileMissing || newChapterIsLower;

      if (shouldUpdateCover) {
        // Reuse the existing cover filename if it exists so we do not
        // leave orphaned cover files when extension differs.
        const savedExt = existingCover
          ? path.extname(existingCover)
          : path.extname(firstPage.filename);
        const targetCoverName = "cover" + savedExt;
        const targetCoverPath = path.join(seriesDir, targetCoverName);

        const sourceImage = path.join(imageDir, firstPage.filename);
        fs.copyFileSync(sourceImage, targetCoverPath);

        // Clean up any orphaned cover files with other extensions.
        for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
          const candidate = path.join(seriesDir, "cover" + ext);
          if (candidate !== targetCoverPath && fs.existsSync(candidate)) {
            try { fs.unlinkSync(candidate); } catch (_) {}
          }
        }

        existingMeta = {
          seriesSlug,
          cover: targetCoverName,
          coverChapterNumber: chapterNumber,
          coverSourceChapter: chapterSegment,
          updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(coverMetaPath, JSON.stringify(existingMeta, null, 2));
      }

      const savedCover = existingMeta.cover;
      // --- AUTO CLEANUP (moved AFTER cover generation) ---
      // Delete the raw image folder to save 50% disk space.
      // (Smart Re-import will just recreate it if you ever need to rebuild).
      fs.promises.rm(imageDir, { recursive: true, force: true })
        .then(() => {
          console.log("[IMPORT] Cleaned up raw images to save space.");
        })
        .catch(cleanupErr => {
          console.error("[IMPORT] Cleanup failed (but PDF is safe):", cleanupErr.message);
        });
      if (savedCover) {
        coverRelative = "/uploads/series/" + seriesSlug + "/" + savedCover;
      }
    }

    // Parse series title from the slug
    const seriesDisplayName = seriesSlug.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    // Parse chapter number from the URL
    let chapterDisplayName = "Chapter 001";
    const displayChapterMatch = finalUrl.match(/\/c(\d+)/i);
    if (displayChapterMatch) {
      chapterDisplayName = "Chapter " + displayChapterMatch[1].padStart(3, "0");
    }

    const manifest = {
      source: finalUrl,
      seriesSlug,
      seriesTitle: seriesDisplayName,
      chapter: chapterDisplayName,
      cover: coverRelative,
      totalPages: pages.length,
      downloaded: ok,
      imageDir: folderName,
      pdf: relativePdf,
      createdAt: new Date().toISOString()
    };

    // Write the manifest to disk ONLY after the PDF is created
    fs.writeFileSync(path.join(dbDir, folderName + ".json"), JSON.stringify(manifest, null, 2));
    

    console.log("[IMPORT] Success → " + relativePdf + " (" + ok + "/" + pages.length + " pages)");

    res.json({
      success: true,
      message: "Imported successfully! " + ok + " pages → PDF ready",
      pages: ok,
      total: pages.length,
      pdf: relativePdf
    });

  } catch (err) {
    console.error("[IMPORT] Error:", err);
    res.status(500).json({ error: err.message || "Import failed" });
  } finally {
    activeImports.delete(importKey);
  }
});



function manifestSlug(value) {
  return String(value || "unknown-manga")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-");
}

app.get("/api/library", (req, res) => {
  const chapters = [];
  const seen = new Set();

  // 1. Read ONLY from the db/ folder
  if (fs.existsSync(dbDir)) {
    for (const file of fs.readdirSync(dbDir)) {
      if (!file.endsWith(".json")) continue;
      const chapterId = file.replace(/\.json$/, "");
      try {
        const manifest = JSON.parse(fs.readFileSync(path.join(dbDir, file), "utf8"));
        const pdfName = path.basename(manifest.pdf || "");
        if (!pdfName || !pdfName.endsWith(".pdf")) continue;
        
        // Just ensure the file exists somewhere in uploads
        let pdfPath = path.join(uploadsDir, pdfName);
        if (!fs.existsSync(pdfPath)) {
          // Try finding it in uploads root
          pdfPath = path.join(uploadsDir, path.basename(pdfName));
        }
        if (!fs.existsSync(pdfPath) || seen.has(pdfName)) continue;

        chapters.push({
          id: chapterId,
          title: manifest.seriesTitle || "Unknown Manga",
          seriesKey: manifest.seriesSlug || "unknown",
          chapter: manifest.chapter || "Chapter",
          pages: manifest.downloaded || 0,
          createdAt: manifest.createdAt || fs.statSync(pdfPath).mtime.toISOString(),
          pdf: "/uploads/" + pdfName
        });
        seen.add(pdfName);
      } catch (e) {
        // Skip bad JSON
      }
    }
  }

  // 2. Group by seriesKey
  const seriesMap = new Map();
  for (const item of chapters) {
    const key = item.seriesKey;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        id: key,
        title: item.title,
        cover: null, // Frontend will handle fallback
        chapterCount: 0,
        chapters: []
      });
    }
    const group = seriesMap.get(key);
    group.chapterCount++;
    group.chapters.push(item);

    // Look for the series cover image
    const seriesCoverPath = path.join(uploadsDir, "series", group.id, "cover.jpg");
    if (!group.cover && fs.existsSync(seriesCoverPath)) {
      group.cover = "/uploads/series/" + group.id + "/cover.jpg";
    }
  }

  // Sort chapters by date
  for (const group of seriesMap.values()) {
    group.chapters.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const seriesList = Array.from(seriesMap.values());

  res.json({
    chapters: chapters,
    series: seriesList,
    total: chapters.length,
    totalSeries: seriesList.length
  });
});

app.post("/api/delete", (req, res) => {
  const { id, pdf } = req.body;
  if (!id) return res.status(400).json({ error: "Missing chapter ID" });

  let deletedFiles = 0;
  const uploadsDir = path.join(__dirname, "uploads");

  try {
    // 1. Delete the PDF file
    if (pdf) {
      const pdfName = path.basename(pdf);
      const pdfPath = path.join(uploadsDir, pdfName);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        deletedFiles++;
      }
    }

    // 2. Delete the chapter folder (images + manifest) if it exists
    // The ID usually matches the folder name (e.g., chapter_123456789)
    const chapterDir = path.join(uploadsDir, id);
    if (fs.existsSync(chapterDir) && fs.statSync(chapterDir).isDirectory()) {
      fs.rmSync(chapterDir, { recursive: true, force: true });
      deletedFiles++;
    }

    res.json({ success: true, deletedFiles });
  } catch (err) {
    console.error("[DELETE] Error:", err);
    res.status(500).json({ error: "Failed to delete: " + err.message });
  }
});




// --- Batch Import & Queue Endpoints ---
app.post("/api/import/batch", (req, res) => {
  const { urls } = req.body;
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: "Provide an array of URLs" });
  }

  const queued = [];
  for (const url of urls) {
    if (!url.trim()) continue;
    const id = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    importJobs[id] = { id, url: url.trim(), status: "pending", message: "In queue..." };
    importQueue.push({ id, url: url.trim() });
    queued.push(id);
  }

  processQueue();
  res.json({ success: true, queued: queued.length, jobs: queued });
});

app.get("/api/import/status", (req, res) => {
  res.json(Object.values(importJobs));
});

app.post("/api/import/clear", (req, res) => {
  for (const id in importJobs) {
    if (importJobs[id].status === "success" || importJobs[id].status === "error") {
      delete importJobs[id];
    }
  }
  res.json({ success: true });
});

// --- ZIP Generator Endpoint ---
app.post("/api/zip", (req, res) => {
  const { pdfs, name } = req.body;
  if (!pdfs || !Array.isArray(pdfs) || pdfs.length === 0) {
    return res.status(400).json({ error: "No PDFs provided" });
  }

  const safeName = (name || "MangaVault_Batch").replace(/[^a-zA-Z0-9_\-]/g, "_");
  const zipName = safeName + "_" + Date.now() + ".zip";
  const zipPath = path.join(uploadsDir, zipName);
  const pdfPaths = pdfs.map(p => path.join(uploadsDir, path.basename(p))).filter(fs.existsSync);

  if (pdfPaths.length === 0) {
    return res.status(400).json({ error: "None of the PDFs exist on disk" });
  }

  try {
    const py = `import sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sys.argv[2:]:
        z.write(f, arcname=__import__('os').path.basename(f))
`;
    const tmpPy = path.join(uploadsDir, "_ziptmp_" + Date.now() + ".py");
    fs.writeFileSync(tmpPy, py);
    try {
      execFileSync("python3", [tmpPy, zipPath, ...pdfPaths]);
    } finally {
      try { fs.unlinkSync(tmpPy); } catch (_) {}
    }
    res.json({ success: true, zip: "/uploads/" + zipName, count: pdfPaths.length });
  } catch (err) {
    console.error("[ZIP] Error:", err);
    res.status(500).json({ error: "Failed to create ZIP: " + err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("MangaVault running on http://0.0.0.0:" + PORT);
});
