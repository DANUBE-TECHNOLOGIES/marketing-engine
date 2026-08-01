"use strict";
module.exports = {
  routes: require("./routes"),
  ...require("./service"),
  ContentGenerationRepository: require("./repository"),
  ...require("./travel-core-executor"),
};
