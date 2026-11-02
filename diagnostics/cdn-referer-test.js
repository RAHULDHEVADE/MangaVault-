const https = require("https");
const fs = require("fs");

const TEST_IMAGE = "https://zjcdn.mangahere.org/store/manga/29855/001.0/compressed/d001.jpg";
const CHAPTER_URL = "https://m.mangatown.com//manga/sweet_home_kim_carnby/c001";

function request(url, headers = {}) {
    return new Promise((resolve) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: "GET",
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
                "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                ...headers
            },
            timeout: 15000
        };

        const req = https.request(options, (res) => {
            let data = Buffer.alloc(0);
            res.on("data", chunk => {
                if (data.length < 512 * 1024) { // max 512KB for test
                    data = Buffer.concat([data, chunk]);
                }
            });
            res.on("end", () => {
                resolve({
                    status: res.statusCode,
                    contentType: res.headers["content-type"] || "",
                    contentLength: res.headers["content-length"] || data.length,
                    server: res.headers["server"] || "",
                    cfRay: res.headers["cf-ray"] || "",
                    bodyPreview: data.slice(0, 200).toString("utf8").replace(/[^\x20-\x7E]/g, ".")
                });
            });
        });

        req.on("timeout", () => {
            req.destroy();
            resolve({ error: "Timeout" });
        });
        req.on("error", (err) => resolve({ error: err.message }));
        req.end();
    });
}

async function main() {
    console.log("=== MANGAVAULT EXPERIMENT 012: CDN Referer Test ===\n");

    // Test 1: No Referer (current behavior)
    console.log("1. No Referer header...");
    const noRef = await request(TEST_IMAGE);
    console.log("   Status:", noRef.status || noRef.error);
    console.log("   Content-Type:", noRef.contentType);
    console.log("   Length:", noRef.contentLength);
    console.log("   Server:", noRef.server);
    console.log("   Preview:", noRef.bodyPreview?.slice(0, 80));
    console.log("");

    // Test 2: Referer = chapter page
    console.log("2. Referer = chapter URL...");
    const withChapterRef = await request(TEST_IMAGE, {
        "Referer": CHAPTER_URL
    });
    console.log("   Status:", withChapterRef.status || withChapterRef.error);
    console.log("   Content-Type:", withChapterRef.contentType);
    console.log("   Length:", withChapterRef.contentLength);
    console.log("   Server:", withChapterRef.server);
    console.log("   Preview:", withChapterRef.bodyPreview?.slice(0, 80));
    console.log("");

    // Test 3: Referer = mangatown root
    console.log("3. Referer = https://www.mangatown.com/ ...");
    const withRootRef = await request(TEST_IMAGE, {
        "Referer": "https://www.mangatown.com/"
    });
    console.log("   Status:", withRootRef.status || withRootRef.error);
    console.log("   Content-Type:", withRootRef.contentType);
    console.log("   Length:", withRootRef.contentLength);
    console.log("   Server:", withRootRef.server);
    console.log("   Preview:", withRootRef.bodyPreview?.slice(0, 80));
    console.log("");

    // Test 4: Referer = m.mangatown.com
    console.log("4. Referer = https://m.mangatown.com/ ...");
    const withMobileRef = await request(TEST_IMAGE, {
        "Referer": "https://m.mangatown.com/"
    });
    console.log("   Status:", withMobileRef.status || withMobileRef.error);
    console.log("   Content-Type:", withMobileRef.contentType);
    console.log("   Length:", withMobileRef.contentLength);
    console.log("   Server:", withMobileRef.server);
    console.log("   Preview:", withMobileRef.bodyPreview?.slice(0, 80));
    console.log("");

    // Save result
    const result = {
        experiment: 12,
        name: "CDN Referer Test",
        testedAt: new Date().toISOString(),
        imageUrl: TEST_IMAGE,
        results: {
            noReferer: noRef,
            chapterReferer: withChapterRef,
            rootReferer: withRootRef,
            mobileReferer: withMobileRef
        }
    };

    fs.writeFileSync("diagnostics/experiment-012-referer.json", JSON.stringify(result, null, 2));
    console.log("Saved: diagnostics/experiment-012-referer.json");
    console.log("\n=== DONE ===");
}

main();
