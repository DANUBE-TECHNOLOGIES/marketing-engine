"use strict";

const express = require("express");
const { buildNetworkCoverage } = require("./network-coverage");
const { buildAnomalyQueue } = require("./anomaly-queue");
const { listPendingPropagation } = require("./propagation-watch");
const { buildPropagationAlerts } = require("./propagation-alerts");
const { buildNetworkHealth } = require("./network-health");

function networkHealthRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/network/health", async (req, res) => {
    try {
      const [agencies, directories, listings, propagationRows] = await Promise.all([
        prisma.agency.findMany({ orderBy: { id: "asc" } }),
        prisma.localDirectory.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
        prisma.directoryListing.findMany({ orderBy: [{ agencyId: "asc" }, { directoryId: "asc" }] }),
        listPendingPropagation(prisma, { limit: req.query.limit })
      ]);
      const coverage = buildNetworkCoverage(agencies, directories, listings);
      const anomalies = buildAnomalyQueue(agencies, directories, listings);
      const alerts = buildPropagationAlerts(propagationRows, { providerKey: "google_business_profile" });
      const health = buildNetworkHealth({ coverage, anomalyCount: anomalies.length, propagationAlerts: alerts.alerts });
      return res.json({ ok: true, health, coverage: coverage.summary, anomalyCount: anomalies.length, propagationAlerts: alerts.total });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { networkHealthRoutes };
