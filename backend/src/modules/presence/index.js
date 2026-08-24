"use strict";

const express = require("express");
const { routes: coreRoutes } = require("./routes");
const { observationRoutes } = require("./observation-routes");
const { discoveryRoutes } = require("./discovery-routes");
const { networkDiscoveryRoutes } = require("./network-discovery-routes");
const { remediationRoutes } = require("./remediation-routes");
const { remediationExecutionRoutes } = require("./remediation-execution-routes");
const { networkGoogleRemediationRoutes } = require("./network-google-remediation-routes");
const { operationalRoutes } = require("./operational-routes");
const { operationAuditRoutes } = require("./operation-audit-routes");
const { operationRetryRoutes } = require("./operation-retry-routes");
const providerRegistry = require("./provider-registry");

function routes({ prisma }) {
  const router = express.Router();
  router.use(coreRoutes({ prisma }));
  router.use(observationRoutes({ prisma }));
  router.use(discoveryRoutes({ prisma }));
  router.use(networkDiscoveryRoutes({ prisma }));
  router.use(remediationRoutes({ prisma }));
  router.use(remediationExecutionRoutes({ prisma }));
  router.use(networkGoogleRemediationRoutes({ prisma }));
  router.use(operationalRoutes({ prisma }));
  router.use(operationAuditRoutes({ prisma }));
  router.use(operationRetryRoutes({ prisma }));
  return router;
}

module.exports = {
  routes,
  providerRegistry
};
