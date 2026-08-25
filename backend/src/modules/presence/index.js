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
const { propagationControlRoutes } = require("./propagation-control-routes");
const { propagationAlertRoutes } = require("./propagation-alert-routes");
const { networkHealthRoutes } = require("./network-health-routes");
const { networkCockpitRoutes } = require("./network-cockpit-routes");
const { networkProviderMatrixRoutes } = require("./network-provider-matrix-routes");
const { campaignRoutes } = require("./campaign-routes");
const { campaignExecutionRoutes } = require("./campaign-execution-routes");
const { campaignReportRoutes } = require("./campaign-report-routes");
const { campaignRecoveryRoutes } = require("./campaign-recovery-routes");
const { pilotRoutes } = require("./pilot-routes");
const { manualRemediationRoutes } = require("./manual-remediation-routes");
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
  router.use(propagationControlRoutes({ prisma }));
  router.use(propagationAlertRoutes({ prisma }));
  router.use(networkHealthRoutes({ prisma }));
  router.use(networkCockpitRoutes({ prisma }));
  router.use(networkProviderMatrixRoutes({ prisma }));
  router.use(campaignRoutes({ prisma }));
  router.use(campaignExecutionRoutes({ prisma }));
  router.use(campaignReportRoutes({ prisma }));
  router.use(campaignRecoveryRoutes({ prisma }));
  router.use(pilotRoutes({ prisma }));
  router.use(manualRemediationRoutes({ prisma }));
  return router;
}

module.exports = { routes, providerRegistry };
