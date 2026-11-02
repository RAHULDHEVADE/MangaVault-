const https = require("https");
const fs = require("fs");

const url = process.argv[2];

if (!url) {
    console.log("Usage: node diagnostics/test.js <chapter-url>");
    process.exit(1);
}

function request(target) {
    return new Promise((resolve) => {
        const req = https.request(target, {
            method: "GET",
            headers: {
                "User-Agent": "MangaVault/1.0"
            },
            timeout: 15000
        }, (res) => {
            let data = "";

            res.on("data", chunk => {
                if (data.length < 2 * 1024 * 1024) {
                    data += chunk;
                }
            });

            res.on("end", () => resolve({
                status: res.statusCode,
                contentType: res.headers["content-type"],
                html: data
            }));
        });

        req.on("timeout", () => {
            req.destroy(new Error("Timeout"));
        });

        req.on("error", error => resolve({
            error: error.message
        }));

        req.end();
    });
}

async function main() {
    console.log("MANGAVAULT DIAGNOSTIC");
    console.log("URL:", url);

    const page = await request(url);

    if (page.error || page.status !== 200) {
        console.log("PAGE ERROR:", page.error || page.status);
        return;
    }

    const images = [
        ...page.html.matchAll(/<img\b[^>]*>/gi)
    ].map(match => {
        const tag = match[0];
        const src = tag.match(
            /(?:src|data-src|data-original)=["']([^"']+)["']/i
        );
        return src ? new URL(src[1], url).href : null;
    }).filter(Boolean);

    const report = {
        testedAt: new Date().toISOString(),
        pageUrl: url,
        pageStatus: page.status,
        pageContentType: page.contentType,
        imageReferencesFound: images.length,
        images,
        note: "Image contents have not been downloaded."
    };

    fs.writeFileSync(
        "diagnostics/report.json",
        JSON.stringify(report, null, 2)
    );

    console.log("PAGE STATUS:", page.status);
    console.log("IMAGE REFERENCES:", images.length);
    console.log("REPORT: diagnostics/report.json");
}

main();
