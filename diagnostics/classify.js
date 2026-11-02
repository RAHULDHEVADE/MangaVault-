const fs = require("fs");

const report = JSON.parse(
    fs.readFileSync("diagnostics/report.json", "utf8")
);

const unique = [...new Set(report.images)];

const pages = unique
    .map(url => {
        const match = url.match(/d(\d+)\.(jpg|jpeg|png|webp)$/i);
        return match
            ? { url, page: Number(match[1]) }
            : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.page - b.page);

const result = {
    chapterUrl: report.pageUrl,
    totalReferences: report.images.length,
    uniqueReferences: unique.length,
    numberedPages: pages.length,
    pages,
    imageContentVerified: false
};

fs.writeFileSync(
    "diagnostics/classified.json",
    JSON.stringify(result, null, 2)
);

console.log("Unique URLs:", unique.length);
console.log("Numbered pages:", pages.length);
console.log("Reading order:", pages.map(p => p.page).join(", "));
console.log("Saved: diagnostics/classified.json");
