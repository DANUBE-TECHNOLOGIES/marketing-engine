"use strict";

module.exports = {
  createRecommendationRoutes: require("./routes"),
  ...require("./service"),
  ...require("./scoring"),
};
