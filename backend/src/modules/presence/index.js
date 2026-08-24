"use strict";

const express = require("express");
const { routes: coreRoutes } = require("./routes");
const { observationRoutes } = require("./observation-routes");
const { discoveryRoutes } = require("./discovery-routes");
const { networkDiscoveryRoutes } = require("./network-discovery-routes");
const providerRegistry = require("./provider-registry");

function routes({ prisma }) {
  const router = express.Router();
  router.use(coreRoutes({ prisma }));
  router.use(observationRoutes({ prisma }));
  router.use(discoveryRoutes({ prisma }));
  router.use(networkDiscoveryRoutes({ prisma }));
  return router;
}

module.exports = {
  routes,
  providerRegistry
};
