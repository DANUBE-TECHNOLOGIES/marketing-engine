"use strict";
module.exports = {
  createSearchRoutes: require("./routes"),
  createSearchService: require("./service").createSearchService,
  normalization: require("./normalization"),
  scoring: require("./scoring"),
};
