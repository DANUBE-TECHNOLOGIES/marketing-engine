"use strict";
module.exports = {
  routes: require("./routes"),
  ...require("./service"),
  ...require("./repository"),
  ...require("./analyzers"),
  ...require("./scorer"),
  ...require("./opportunities"),
  ...require("./recommendations"),
  ...require("./planner")
};
