const https = require("https");
const fs = require("fs");
const path = require("path");

const MANIFEST_PATH = "diagnostics/manifest.json";
const OUTPUT_DIR = "uploads/sweet_home_c001";
const REFERER = "https://m.mangatown.com/";

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
                "Accept-Language": "en-US,en;q=0.9"
            },
            timeout: 20000
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
                    fs.writeFileSync(savePath, buffer);
                    resolve({
                        success: true,
                        status: 200,
                        size: buffer.length,
                        contentType
                    });
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

async function main() {
    console.log("=== MANGAVAULT EXPERIMENT 013: Page Downloader ===\n");

    if (!fs.existsSync(MANIFEST_PATH)) {
        console.log("ERROR: manifest.json not found. Run previous steps first.");
        process.exit(1);
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
    console.log(`Title   : ${manifest.title}`);
    console.log(`Chapter : ${manifest.chapter}`);
    console.log(`Pages   : ${manifest.totalPages}`);
    console.log(`Output  : ${OUTPUT_DIR}\n`);

    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const page of manifest.pages) {
        const filename = page.filename; // d001.jpg etc.
        const savePath = path.join(OUTPUT_DIR, filename);

        process.stdout.write(`Page \( {String(page.pageNumber).padStart(2, "0")}/ \){manifest.totalPages} → ${filename} ... `);

        const result = await downloadImage(page.imageUrl, savePath);

        if (result.success) {
            console.log(`OK (${(result.size / 1024).toFixed(1)} KB)`);
            successCount++;
            page.status = "downloaded";
            page.localPath = savePath;
            page.size = result.size;
        } else {
            console.log(`FAIL (${result.error || result.status})`);
            failCount++;
            page.status = "failed";
            page.error = result.error || `HTTP ${result.status}`;
        }

        results.push({
            pageNumber: page.pageNumber,
            filename,
            ...result
        });

        // Small delay to be polite
        await new Promise(r => setTimeout(r, 300));
    }

    // Update manifest
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

    // Save download report
    const report = {
        experiment: 13,
        name: "Page Downloader",
        testedAt: new Date().toISOString(),
        title: manifest.title,
        chapter: manifest.chapter,
        totalPages: manifest.totalPages,
        successCount,
        failCount,
        outputDir: OUTPUT_DIR,
        results
    };
    fs.writeFileSync("diagnostics/experiment-013-download.json", JSON.stringify(report, null, 2));

    console.log("\n=== SUMMARY ===");
    console.log(`Success : ${successCount}`);
    console.log(`Failed  : ${failCount}`);
    console.log(`Saved   : ${OUTPUT_DIR}/`);
    console.log(`Report  : diagnostics/experiment-013-download.json`);
    console.log(`Manifest updated with download status.`);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
