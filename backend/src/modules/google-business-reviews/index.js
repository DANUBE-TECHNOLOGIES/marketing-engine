"use strict";

module.exports = {
  routes: require("./routes"),
  Repository: require("./repository"),
  Provider: require("./provider"),
  ...require("./service"),
};
