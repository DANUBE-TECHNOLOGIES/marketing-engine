"use strict";
module.exports = {
  routes: require("./routes"),
  ...require("./repository"),
  ...require("./service"),
  ...require("./validation"),
};
