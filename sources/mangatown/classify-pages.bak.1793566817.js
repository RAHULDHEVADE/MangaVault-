// Extracts page numbers from the 'alt' attribute if filename patterns fail
function extractAltNumber(html, url) {
  // Try to find the <img> tag that contains this URL and pull "Page X" from alt
  const regex = new RegExp('<img[^>]+src=["\']' + url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>', 'i');
  const match = html.match(regex);
  if (match) {
    const altMatch = match[0].match(/Page\s+(\d+)/i);
    if (altMatch) return Number(altMatch[1]);
  }
  return null;
}

function classifyPages(urls, html = "") {
  const IGNORE = /(?:^|\/)(?:logo|icon|avatar|sprite|banner|ads?|thumb)[^\/]*\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i;
  // Wider regex: any 1-4 digits right before the extension
  const FILE_RE = /(?:^|\/)(?:[a-z]+_)?(\d{1,4})\.(jpg|jpeg|png|webp)(?:\?|$)/i;

  const seen = new Set();
  const pages = [];

  for (const url of urls) {
    if (IGNORE.test(url)) continue;

    const match = url.match(FILE_RE);
    if (match) {
      const num = Number(match[1]);
      const ext = match[2].toLowerCase();

      if (!Number.isFinite(num) || num < 1 || num > 2000) continue;
      if (seen.has(num)) continue;
      seen.add(num);

      const filename = "d" + String(num).padStart(3, "0") + "." + ext;
      pages.push({ url, page: num, filename });
    }
  }

  // Sort by page number
  pages.sort((a, b) => a.page - b.page);
  return pages;
}

module.exports = { classifyPages, extractAltNumber };
