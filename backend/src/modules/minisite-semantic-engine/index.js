"use strict";

const { routes } = require("./routes");
const { MiniSiteSemanticEngineService } = require("./service");
const {
  analyzePage,
  buildCannibalization,
  coverageForIntent,
  fingerprint,
  intentScore,
  networkSemanticPlan,
  semanticPlan,
} = require("./engine");

module.exports = {
  routes,
  MiniSiteSemanticEngineService,
  analyzePage,
  buildCannibalization,
  coverageForIntent,
  fingerprint,
  intentScore,
  networkSemanticPlan,
  semanticPlan,
};
