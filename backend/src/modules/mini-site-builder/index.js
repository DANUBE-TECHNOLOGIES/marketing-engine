"use strict";
module.exports = {
  routes: require("./routes"),
  MiniSiteBuilderService: require("./service"),
  PageBlockRepository: require("./repository"),
  validation: require("./validation"),
  renderer: require("./renderers/html-renderer"),
};
