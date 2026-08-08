"use strict";

const {
  routes,
} = require("./routes");

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

module.exports = {
  routes,

  MiniSiteSeoEnrichmentService,
  MiniSiteSeoRepository,

  buildSeoPlan,
  buildSeoUpdate,
  summarizeExecution,

  descriptionForPage,
  generateSeoMetadata,
  titleForPage,
};
