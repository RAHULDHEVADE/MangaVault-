const mangatown = require("./mangatown");
const adapters = [mangatown];
module.exports = {
  detectSource: (url) => adapters.find(a => a.validateUrl(url)) || null
};
