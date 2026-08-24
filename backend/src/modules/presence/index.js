"use strict";

const express = require("express");
const { routes: coreRoutes } = require("./routes");
const { observationRoutes } = require("./observation-routes");
const providerRegistry = require("./provider-registry");

function routes({ prisma }) {
  const router = express.Router();
  router.use(coreRoutes({ prisma }));
  router.use(observationRoutes({ prisma }));
  return router;
}

module.exports = {
  routes,
  providerRegistry
};
