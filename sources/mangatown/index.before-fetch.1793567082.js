const { extractImages } = require("./extract-images");
const { classifyPages } = require("./classify-pages");

module.exports = {
  sourceId: "mangatown",
  adapterVersion: 3,

  validateUrl: (url) => {
    try {
      const host = new URL(url).hostname;
      return host.includes("mangatown.com");
    } catch (e) { return false; }
  },

  normalizeUrl: (url) => {
    try {
      const u = new URL(url);
      let path = u.pathname.replace(/\/+/g, "/");
      path = path.replace(/\/$/, "");
      return u.protocol + "//" + u.host + path;
    } catch (e) {
      return url;
    }
  },

  extractPageRefs: (html, currentUrl) => {
    const rawUrls = extractImages(html, currentUrl);
    
    // Try file-based classification first
    let pages = classifyPages(rawUrls, html);
    
    if (pages.length > 0) {
      return { pages, retryUrl: null };
    }

    let retryUrl = null;
    if (!currentUrl.endsWith(".html")) {
      retryUrl = currentUrl + "/1.html";
    }
    return { pages: [], retryUrl };
  }
};
