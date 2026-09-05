"use strict";

const routes = require("./routes");
const baselineRoutes = require("./baseline-routes");
const paidPlanRoutes = require("./paid-plan-routes");
const noSearchRoutes = require("./no-search-routes");
const { RankingGridRepository } = require("./repository");
const { RankingGridService } = require("./service");
const { RankingGridProvider, UnconfiguredRankingGridProvider } = require("./provider");
const { generateGrid } = require("./grid");
const { summarizePoints } = require("./aggregate");

module.exports = {
  routes,
  baselineRoutes,
  paidPlanRoutes,
  noSearchRoutes,
  RankingGridRepository,
  RankingGridService,
  RankingGridProvider,
  UnconfiguredRankingGridProvider,
  generateGrid,
  summarizePoints,
};
