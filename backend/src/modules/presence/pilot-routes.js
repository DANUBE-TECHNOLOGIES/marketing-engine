"use strict";

const express = require("express");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildCampaignPlan } = require("./campaign-planner");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluateControlledPilot } = require("./pilot-readiness");

function pilotRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/pilot/preview", async (req, res) => {
    try {
      const [state, deploymentReadiness] = await Promise.all([
        loadCockpitState(prisma),
        buildDeploymentReadiness(prisma)
      ]);
      const plan = buildCampaignPlan(state, {
        agencyIds: req.body?.agencyIds,
        providerKeys: req.body?.providerKeys || ["google_business_profile"],
        maxItems: req.body?.maxItems || 10,
        allowSensitive: req.body?.allowSensitive === true
      });
      const readiness = evaluateControlledPilot({ deploymentReadiness, plan }, {
        maxAgencies: req.body?.maxAgencies || 3,
        maxItems: req.body?.maxItems || 10,
        minGoogleCoveragePercent: req.body?.minGoogleCoveragePercent || 80,
        requireNoSensitive: req.body?.requireNoSensitive !== false
      });
      return res.status(readiness.ready ? 200 : 409).json({ ok: readiness.ready, externalWrite: false, persisted: false, readiness, plan });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { pilotRoutes };
