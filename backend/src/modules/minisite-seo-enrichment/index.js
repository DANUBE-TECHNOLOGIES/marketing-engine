"use strict";

const express = require("express");

const {
  routes: enrichmentRoutes,
} = require("./routes");

const {
  routes: qualityUpliftRoutes,
} = require("../minisite-seo-quality-uplift/routes");

const {
  MiniSiteSeoEnrichmentService,
} = require("./service");

const {
  MiniSiteSeoRepository,
} = require("./repository");

const {
  buildSeoPlan,
} = require("./planner");

const {
  buildSeoUpdate,
  summarizeExecution,
} = require("./executor");

const {
  descriptionForPage,
  generateSeoMetadata,
  titleForPage,
} = require("./generator");

const {
  buildQualityUpliftWriteIntents,
} = require("./quality-uplift-write-intent");

const {
  applyQualityUpliftWriteIntent,
} = require("./quality-uplift-apply-executor");

function routes(options = {}) {
  const router = express.Router();
  router.use(enrichmentRoutes(options));
  router.use(qualityUpliftRoutes(options));
  return router;
}

module.exports = {
  routes,

  MiniSiteSeoEnrichmentService,
  MiniSiteSeoRepository,

  buildSeoPlan,
  buildSeoUpdate,
  summarizeExecution,
  buildQualityUpliftWriteIntents,
  applyQualityUpliftWriteIntent,

  descriptionForPage,
  generateSeoMetadata,
  titleForPage,
};
