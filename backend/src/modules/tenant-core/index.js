"use strict";
module.exports = {
  routes: require("./routes"),
  ...require("./context"),
  ...require("./middleware"),
  ...require("./repository"),
  ...require("./service"),
};
