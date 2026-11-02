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
      } catch (e) {}
    }
  }
  return [...new Set(urls)];
}
module.exports = { extractImages };
