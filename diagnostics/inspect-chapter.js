#!/usr/bin/env node
/* MangaVault — read-only chapter inspector.
 * Usage: node diagnostics/inspect-chapter.js "<chapter-url>"
 * Prints structural evidence only. Does NOT save files, does NOT touch uploads.
 * Scrubs Cookie/Authorization/Set-Cookie from any output.
 */
const http = require("http");
const https = require("https");

const target = process.argv[2];
if (!target) { console.error("Usage: node diagnostics/inspect-chapter.js <url>"); process.exit(2); }

const UA = "Mozilla/5.0 (Linux; Android 13; Termux) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Mobile Safari/537.36";

function fetchOnce(url, hops = 0) {
  return new Promise((resolve, reject) => {
    if (hops > 5) return reject(new Error("too many redirects"));
    let u;
    try { u = new URL(url); } catch (e) { return reject(new Error("bad url: " + url)); }
    const lib = u.protocol === "https:" ? https : http;
    const req = lib.request(
      u,
      {
        method: "GET",
        headers: {
          "User-Agent": UA,
          "Accept": "text/html,application/xhtml+xml,*/*",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": u.origin + "/",
        },
        timeout: 20000,
      },
      (res) => {
        const status = res.statusCode || 0;
        const loc = res.headers.location;
        if (status >= 300 && status < 400 && loc) {
          res.resume();
          return resolve(fetchOnce(new URL(loc, url).href, hops + 1));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({
            finalUrl: url,
            status,
            headers: {
              "content-type": res.headers["content-type"] || "",
              "content-length": res.headers["content-length"] || "",
              "set-cookie": res.headers["set-cookie"] ? "[redacted]" : "",
            },
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

function attr(tag, name) {
  const re = new RegExp(name + "\\s*=\\s*(\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
  const m = tag.match(re);
  if (!m) return null;
  return (m[2] !== undefined ? m[2] : m[3] !== undefined ? m[3] : m[4]) || null;
}

function firstSrcset(url) {
  if (!url) return null;
  return url.split(",")[0].trim().split(/\s+/)[0] || null;
}

(async () => {
  console.log("=== MangaVault chapter inspector (read-only) ===");
  console.log("Requested URL:", target);
  let r;
  try {
    r = await fetchOnce(target);
  } catch (e) {
    console.log("FETCH ERROR:", e.message);
    process.exit(1);
  }
  const text = r.body.toString("utf8");
  console.log("Final URL     :", r.finalUrl);
  console.log("HTTP status   :", r.status);
  console.log("Content-Type  :", r.headers["content-type"]);
  console.log("Body bytes    :", r.body.length);
  console.log("");

  // Meta refresh / JS redirect hints
  const metaRefresh = text.match(/<meta[^>]+http-equiv\s*=\s*["']?refresh["']?[^>]*>/i);
  console.log("meta-refresh  :", metaRefresh ? metaRefresh[0].slice(0, 200) : "none");

  // Reader shell markers
  const markers = ["reader", "page-image", "chapter-content", "reading-content", "chapter-img", "manga-image", "page-break", "viewer"];
  const foundMarkers = markers.filter((m) => new RegExp(m, "i").test(text));
  console.log("reader markers:", foundMarkers.length ? foundMarkers.join(", ") : "none");
  console.log("");

  // All <img> tags
  const imgs = [...text.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  console.log("<img> count   :", imgs.length);
  console.log("--- <img> inventory (first 40) ---");
  imgs.slice(0, 40).forEach((tag, i) => {
    const src = attr(tag, "src");
    const ds = attr(tag, "data-src");
    const dorig = attr(tag, "data-original");
    const dlazy = attr(tag, "data-lazy-src");
    const dsrcset = attr(tag, "data-srcset") || attr(tag, "srcset");
    const cls = attr(tag, "class");
    const w = attr(tag, "width");
    const h = attr(tag, "height");
    console.log(
      `[${i}] src=${src || "-"} | data-src=${ds || "-"} | data-original=${dorig || "-"} | data-lazy-src=${dlazy || "-"} | srcset=${firstSrcset(dsrcset) || "-"} | class=${cls || "-"} | w=${w || "-"} h=${h || "-"}`
    );
  });
  console.log("");

  // URL-like strings inside <script> blobs
  const scriptBlobs = [...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const urlLike = new Set();
  for (const blob of scriptBlobs) {
    const re = /(https?:\\?\/\\?\/[^"'\\\s]+\.(?:jpg|jpeg|png|webp)[^"'\\\s]*)/gi;
    let m;
    while ((m = re.exec(blob))) urlLike.add(m[1].replace(/\\\//g, "/"));
  }
  console.log("script <img>-like URL strings:", urlLike.size);
  [...urlLike].slice(0, 20).forEach((u, i) => console.log(`  s[${i}] ${u}`));
  console.log("");

  // Filename patterns seen
  const patterns = { dNNN: 0, NNN: 0, pageN: 0, chapter: 0, other: 0 };
  const allUrls = [];
  for (const tag of imgs) {
    for (const a of ["src", "data-src", "data-original", "data-lazy-src", "srcset"]) {
      let v = attr(tag, a);
      if (!v) continue;
      if (a === "srcset") v = firstSrcset(v);
      if (v) allUrls.push(v);
    }
  }
  for (const u of urlLike) allUrls.push(u);
  for (const u of allUrls) {
    if (/\/d\d+\.(jpg|jpeg|png|webp)/i.test(u)) patterns.dNNN++;
    else if (/\/\d{2,4}\.(jpg|jpeg|png|webp)/i.test(u)) patterns.NNN++;
    else if (/page[_-]?\d+/i.test(u)) patterns.pageN++;
    else if (/chapter[_-]?\d+/i.test(u)) patterns.chapter++;
    else if (/\.(jpg|jpeg|png|webp)/i.test(u)) patterns.other++;
  }
  console.log("filename-pattern tally:", JSON.stringify(patterns));
  console.log("");
  console.log("=== end ===");
})();
