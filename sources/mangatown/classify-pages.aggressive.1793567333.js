function classifyPages(urls, html = "") {
  const IGNORE = /(?:^|\/)(?:logo|icon|avatar|sprite|banner|ads?|thumb)[^\/]*\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i;
  const seen = new Set();
  const pages = [];

  for (const url of urls) {
    if (IGNORE.test(url)) continue;
    
    // 1. Try to find the page number in the alt tag first
    let num = null;
    if (html) {
      const regex = new RegExp('<img[^>]+src=["\']' + url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>', 'i');
      const match = html.match(regex);
      if (match) {
        const altMatch = match[0].match(/Page\s+(\d+)/i);
        if (altMatch) num = Number(altMatch[1]);
      }
    }

    // 2. If no alt match, try filename pattern (e.g. d001.jpg)
    if (num === null) {
      const fileMatch = url.match(/(?:^|\/)(?:[a-z]+_)?(\d{1,4})\.(jpg|jpeg|png|webp)(?:\?|$)/i);
      if (fileMatch) num = Number(fileMatch[1]);
    }

    if (num === null || !Number.isFinite(num) || num < 1 || num > 2000) continue;
    if (seen.has(num)) continue;
    seen.add(num);

    const extMatch = url.match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
    const filename = "d" + String(num).padStart(3, "0") + "." + ext;

    pages.push({ url, page: num, filename });
  }

  pages.sort((a, b) => a.page - b.page);
  return pages;
}

module.exports = { classifyPages };
