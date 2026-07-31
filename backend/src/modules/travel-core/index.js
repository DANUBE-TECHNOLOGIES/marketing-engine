"use strict";

module.exports = {
  routes: require("./routes"),
  TravelCoreRepository: require("./repository"),
  ...require("./service"),
  ...require("./validation"),
};
