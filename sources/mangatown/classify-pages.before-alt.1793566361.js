function classifyPages(urls) {
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
module.exports = { classifyPages };
