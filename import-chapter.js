#!/usr/bin/env node
/**
 * MangaVault - MangaTown Chapter Importer
 * Usage: node import-chapter.js <chapter-url>
 */

const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REFERER = "https://m.mangatown.com/";
const USER_AGENT = "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";

function fetch(url, options = {}) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const lib = u.protocol === "https:" ? https : http;
        const req = lib.request(url, {
            method: options.method || "GET",
            headers: {
                "User-Agent": USER_AGENT,
                "Accept": options.accept || "text/html,application/xhtml+xml",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": options.referer || REFERER,
                ...options.headers
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
            } catch {}
        }
    }
    return [...new Set(urls)];
}

function classifyPages(urls) {
    return urls
        .map(url => {
            const match = url.match(/d(\d+)\.(jpg|jpeg|png|webp)/i);
            return match ? { url, page: Number(match[1]), filename: `d\( {String(match[1]).padStart(3, "0")}. \){match[2].toLowerCase()}` } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.page - b.page);
}

function sanitizeName(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

async function downloadImage(url, savePath, retries = 3) {
    for (let i = 1; i <= retries; i++) {
        try {
            const res = await fetch(url, {
                accept: "image/webp,image/apng,image/*,*/*;q=0.8",
                referer: REFERER
            });
            if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
            if (!res.headers["content-type"]?.startsWith("image/")) throw new Error("Not an image");
            if (res.buffer.length < 1000) throw new Error("Too small");
            fs.writeFileSync(savePath, res.buffer);
            return { success: true, size: res.buffer.length };
        } catch (err) {
            if (i === retries) return { success: false, error: err.message };
            await new Promise(r => setTimeout(r, 600 * i));
        }
    }
}

async function main() {
    const chapterUrl = process.argv[2];
    if (!chapterUrl) {
        console.log("Usage: node import-chapter.js <chapter-url>");
        console.log("Example: node import-chapter.js \"https://m.mangatown.com/manga/sweet_home_kim_carnby/c001\"");
        process.exit(1);
    }

    console.log("╔══════════════════════════════════════╗");
    console.log("║     MangaVault Chapter Importer      ║");
    console.log("╚══════════════════════════════════════╝\n");
    console.log("URL:", chapterUrl);
    console.log("");

    // 1. Fetch chapter HTML
    console.log("→ Fetching chapter page...");
    let page;
    try {
        page = await fetch(chapterUrl);
    } catch (err) {
        console.error("Failed to fetch chapter:", err.message);
        process.exit(1);
    }
    if (page.status !== 200) {
        console.error("Chapter page returned:", page.status);
        process.exit(1);
    }
    console.log("  Status: 200 OK\n");

    // 2. Extract + classify images
    console.log("→ Extracting page images...");
    const imageUrls = extractImages(page.text, chapterUrl);
    const pages = classifyPages(imageUrls);

    if (pages.length === 0) {
        console.error("No page images found. Site structure may have changed.");
        process.exit(1);
    }
    console.log(`  Found ${pages.length} pages\n`);

    // 3. Create folder
    const folderName = "chapter_" + Date.now();
    const imageDir = path.join("uploads", folderName);
    fs.mkdirSync(imageDir, { recursive: true });

    // 4. Download pages
    console.log("→ Downloading pages...");
    let ok = 0, fail = 0;
    for (const p of pages) {
        const savePath = path.join(imageDir, p.filename);
        process.stdout.write(`  Page \( {String(p.page).padStart(2, "0")}/ \){pages.length} ${p.filename} ... `);
        const result = await downloadImage(p.url, savePath);
        if (result.success) {
            console.log(`OK (${(result.size/1024).toFixed(0)} KB)`);
            ok++;
            p.status = "downloaded";
            p.size = result.size;
        } else {
            console.log(`FAIL (${result.error})`);
            fail++;
            p.status = "failed";
        }
        await new Promise(r => setTimeout(r, 350));
    }
    console.log(`\n  Downloaded: \( {ok}/ \){pages.length}  Failed: ${fail}\n`);

    if (ok === 0) {
        console.error("No pages downloaded. Aborting.");
        process.exit(1);
    }

    // 5. Create PDF
    console.log("→ Generating PDF...");
    const pdfName = `chapter_${folderName}.pdf`;
    const pdfPath = path.join("uploads", pdfName);

    try {
        execSync(`python3 diagnostics/make-pdf.py "\( {imageDir}" " \){pdfPath}"`, { stdio: "inherit" });
    } catch (err) {
        console.error("PDF generation failed.");
        process.exit(1);
    }

    // 6. Save simple manifest
    const manifest = {
        source: chapterUrl,
        totalPages: pages.length,
        downloaded: ok,
        failed: fail,
        imageDir,
        pdfPath,
        createdAt: new Date().toISOString(),
        pages
    };
    fs.writeFileSync(path.join(imageDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    console.log("\n╔══════════════════════════════════════╗");
    console.log("║              SUCCESS                 ║");
    console.log("╚══════════════════════════════════════╝");
    console.log(`PDF ready : ${pdfPath}`);
    console.log(`Images    : ${imageDir}/`);
    console.log(`Pages     : \( {ok}/ \){pages.length}`);
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
