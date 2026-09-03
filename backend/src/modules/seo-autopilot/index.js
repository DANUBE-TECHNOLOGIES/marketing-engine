"use strict";
module.exports = {
  routes: require("./routes"),
  ...require("./service"),
  ...require("./repository"),
  ...require("./executor"),
  ...require("./policy"),
};
