"use strict";
module.exports = {
  routes: require("./routes"),
  ...require("./context"),
  ...require("./middleware"),
  ...require("./repository"),
  ...require("./scoped-repository"),
  ...require("./service"),
};
