const { extractImages } = require("./extract-images");
const { classifyPages } = require("./classify-pages");

module.exports = {
  sourceId: "mangatown",
  adapterVersion: 4,
  
  validateUrl: (url) => {
    try { return new URL(url).hostname.includes("mangatown.com"); } 
    catch (e) { return false; }
  },

  normalizeUrl: (url) => {
    try {
      const u = new URL(url);
      let path = u.pathname.replace(/\/+/g, "/").replace(/\/$/, "");
      return u.protocol + "//" + u.host + path;
    } catch (e) { return url; }
  },

  extractPageRefs: (html, currentUrl) => {
    const rawUrls = extractImages(html, currentUrl);
    let pages = classifyPages(rawUrls, html);

    if (pages.length > 0) return { pages, retryUrl: null };

    let retryUrl = null;
    if (!currentUrl.endsWith(".html")) retryUrl = currentUrl + "/1.html";
    
    return { pages: [], retryUrl };
  }
};
