const express = require("express");
const path = require("path");
const fs = require("fs");
const https = require("https");
const http = require("http");
const { execSync } = require("child_process");

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const REFERER = "https://m.mangatown.com/";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, {
      method: options.method || "GET",
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": options.accept || "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": options.referer || REFERER,
        ...(options.headers || {})
      },
      timeout: 20000
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          status: res.statusCode,
          headers: res.headers,
          buffer,
          text: buffer.toString("utf8")
        });
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.on("error", reject);
    req.end();
  });
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
  const pages = [];
  for (const url of urls) {
    const match = url.match(/d(\d+)\.(jpg|jpeg|png|webp)/i);
    if (match) {
      const num = Number(match[1]);
      const ext = match[2].toLowerCase();
      const filename = "d" + String(num).padStart(3, "0") + "." + ext;
      pages.push({ url, page: num, filename });
    }
  }
  pages.sort((a, b) => a.page - b.page);
  return pages;
}

async function downloadImage(url, savePath, retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      const res = await fetchUrl(url, {
        accept: "image/webp,image/apng,image/*,*/*;q=0.8",
        referer: REFERER
      });
      if (res.status !== 200) throw new Error("HTTP " + res.status);
      if (!res.headers["content-type"] || !res.headers["content-type"].startsWith("image/")) {
        throw new Error("Not an image");
      }
      if (res.buffer.length < 1000) throw new Error("Too small");
      fs.writeFileSync(savePath, res.buffer);
      return { success: true, size: res.buffer.length };
    } catch (err) {
      if (i === retries) return { success: false, error: err.message };
      await new Promise(r => setTimeout(r, 600 * i));
    }
  }
}

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

  console.log("\n[IMPORT] Starting:", url);

  try {
    const page = await fetchUrl(url);
    if (page.status !== 200) {
      return res.status(400).json({ error: "Chapter page returned " + page.status });
    }

    const imageUrls = extractImages(page.text, url);
    const pages = classifyPages(imageUrls);

    if (pages.length === 0) {
      return res.status(400).json({ error: "No page images found on this chapter" });
    }

    console.log("[IMPORT] Found " + pages.length + " pages");

    const folderName = "chapter_" + Date.now();
    const imageDir = path.join(__dirname, "uploads", folderName);
    fs.mkdirSync(imageDir, { recursive: true });

    let ok = 0;
    for (const p of pages) {
      const savePath = path.join(imageDir, p.filename);
      const result = await downloadImage(p.url, savePath);
      if (result.success) {
        ok++;
        p.status = "downloaded";
        p.size = result.size;
      } else {
        p.status = "failed";
        p.error = result.error;
      }
      await new Promise(r => setTimeout(r, 300));
    }

    if (ok === 0) {
      return res.status(500).json({ error: "Failed to download any pages" });
    }

    const pdfName = folderName + ".pdf";
    const pdfPath = path.join(__dirname, "uploads", pdfName);
    const relativePdf = "/uploads/" + pdfName;

    try {
      execSync('python3 diagnostics/make-pdf.py "' + imageDir + '" "' + pdfPath + '"', {
        stdio: "pipe",
        timeout: 60000
      });
    } catch (err) {
      console.error("[IMPORT] PDF failed:", err.message);
      return res.status(500).json({ error: "Pages downloaded but PDF generation failed" });
    }

    const manifest = {
      source: url,
      totalPages: pages.length,
      downloaded: ok,
      imageDir: folderName,
      pdf: relativePdf,
      createdAt: new Date().toISOString()
    };
    fs.writeFileSync(path.join(imageDir, "manifest.json"), JSON.stringify(manifest, null, 2));

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
  }
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, "0.0.0.0", () => {
  console.log("MangaVault running on http://0.0.0.0:" + PORT);
});
