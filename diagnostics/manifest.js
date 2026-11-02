const fs = require("fs");

const report = JSON.parse(
    fs.readFileSync("diagnostics/classified.json", "utf8")
);

const pages = report.pages.map((item, index) => ({
    pageNumber: index + 1,
    filename: item.url.split("/").pop(),
    imageUrl: item.url,
    status: "not_downloaded"
}));

const manifest = {
    title: "Sweet Home",
    author: "Kim Carnby",
    chapter: "001",
    source: report.chapterUrl,
    totalPages: pages.length,
    pages
};

fs.writeFileSync(
    "diagnostics/manifest.json",
    JSON.stringify(manifest, null, 2)
);

console.log("Manifest created!");
console.log("Title:", manifest.title);
console.log("Chapter:", manifest.chapter);
console.log("Pages:", manifest.totalPages);
console.log("Saved: diagnostics/manifest.json");
