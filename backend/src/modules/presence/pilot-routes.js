"use strict";

const express = require("express");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildCampaignPlan } = require("./campaign-planner");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluateControlledPilot } = require("./pilot-readiness");
const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");

function mergePilotReadiness(controlled, activationGate) {
  const blockers = [...new Set([...(controlled.blockers || []), ...(activationGate.blockers || [])])];
  const warnings = [...new Set([...(controlled.warnings || []), ...(activationGate.warnings || [])])];
  const ready = controlled.ready === true && activationGate.ready === true;
  return Object.freeze({
    ...controlled,
    ready,
    decision: ready ? "go" : "no_go",
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings),
    activationGate
  });
}

function pilotRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/pilot/preview", async (req, res) => {
    try {
      const [state, deploymentReadiness, frozenPreflight] = await Promise.all([
        loadCockpitState(prisma),
        buildDeploymentReadiness(prisma),
        getLatestDeploymentPreflight(prisma)
      ]);
      const plan = buildCampaignPlan(state, {
        agencyIds: req.body?.agencyIds,
        providerKeys: req.body?.providerKeys || ["google_business_profile"],
        maxItems: req.body?.maxItems || 10,
        allowSensitive: req.body?.allowSensitive === true
      });
      const controlled = evaluateControlledPilot({ deploymentReadiness, plan }, {
        maxAgencies: req.body?.maxAgencies || 3,
        maxItems: req.body?.maxItems || 10,
        minGoogleCoveragePercent: req.body?.minGoogleCoveragePercent || 80,
        requireNoSensitive: req.body?.requireNoSensitive !== false
      });
      const activationGate = evaluatePilotActivationGate({ preflight: frozenPreflight, currentReadiness: deploymentReadiness });
      const readiness = mergePilotReadiness(controlled, activationGate);
      return res.status(readiness.ready ? 200 : 409).json({ ok: readiness.ready, externalWrite: false, persisted: false, readiness, plan, frozenPreflight: frozenPreflight ? { preflightId: frozenPreflight.preflightId, createdAt: frozenPreflight.createdAt, status: frozenPreflight.status } : null });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { pilotRoutes, mergePilotReadiness };
