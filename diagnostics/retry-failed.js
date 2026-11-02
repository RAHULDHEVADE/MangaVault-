const https = require("https");
const fs = require("fs");
const path = require("path");

const MANIFEST_PATH = "diagnostics/manifest.json";
const OUTPUT_DIR = "uploads/sweet_home_c001";
const REFERER = "https://m.mangatown.com/";
const MAX_RETRIES = 3;
const DELAY_MS = 800;

function downloadImage(url, savePath) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Referer": REFERER,
                "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive"
            },
            timeout: 25000
        };

        const req = https.request(options, (res) => {
            if (res.statusCode !== 200) {
                resolve({ success: false, status: res.statusCode, error: `HTTP ${res.statusCode}` });
                res.resume();
                return;
            }

            const contentType = res.headers["content-type"] || "";
            if (!contentType.startsWith("image/")) {
                resolve({ success: false, status: res.statusCode, error: `Not an image: ${contentType}` });
                res.resume();
                return;
            }

            const chunks = [];
            res.on("data", chunk => chunks.push(chunk));
            res.on("end", () => {
                try {
                    const buffer = Buffer.concat(chunks);
                    if (buffer.length < 1000) {
                        resolve({ success: false, error: "File too small, probably error page" });
                        return;
                    }
                    fs.writeFileSync(savePath, buffer);
                    resolve({ success: true, status: 200, size: buffer.length, contentType });
                } catch (err) {
                    resolve({ success: false, error: err.message });
                }
            });
        });

        req.on("timeout", () => {
            req.destroy();
            resolve({ success: false, error: "Timeout" });
        });
        req.on("error", (err) => resolve({ success: false, error: err.message }));
        req.end();
    });
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function main() {
    console.log("=== MANGAVAULT: Retry Failed Pages ===\n");

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    const failedPages = manifest.pages.filter(p => p.status !== "downloaded");

    if (failedPages.length === 0) {
        console.log("All pages already downloaded! Nothing to retry.");
        return;
    }

    console.log(`Found ${failedPages.length} failed pages. Retrying...\n`);

    let successCount = 0;
    let stillFailed = 0;

    for (const page of failedPages) {
        const savePath = path.join(OUTPUT_DIR, page.filename);
        let success = false;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            process.stdout.write(`Page \( {String(page.pageNumber).padStart(2, "0")} ( \){page.filename}) attempt \( {attempt}/ \){MAX_RETRIES} ... `);

            const result = await downloadImage(page.imageUrl, savePath);

            if (result.success) {
                console.log(`OK (${(result.size / 1024).toFixed(1)} KB)`);
                page.status = "downloaded";
                page.localPath = savePath;
                page.size = result.size;
                delete page.error;
                success = true;
                successCount++;
                break;
            } else {
                console.log(`FAIL (${result.error || result.status})`);
                if (attempt < MAX_RETRIES) {
                    await sleep(DELAY_MS * attempt); // increasing delay
                }
            }
        }

        if (!success) {
            page.status = "failed";
            stillFailed++;
        }

        await sleep(DELAY_MS);
    }

    // Save updated manifest
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    console.log("\n=== RETRY SUMMARY ===");
    console.log(`Newly downloaded : ${successCount}`);
    console.log(`Still failed     : ${stillFailed}`);
    console.log(`Total downloaded : \( {manifest.pages.filter(p => p.status === "downloaded").length}/ \){manifest.totalPages}`);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
