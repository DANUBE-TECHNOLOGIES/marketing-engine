"use strict";

const express = require("express");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildNetworkCockpit } = require("./network-cockpit");
const { buildCampaignPlan } = require("./campaign-planner");
const { createCampaign } = require("./campaign-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluateControlledPilot } = require("./pilot-readiness");
const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { buildPilotAgencyRecommendations } = require("./pilot-selector");

function mergePilotReadiness(controlled, activationGate) {
  const blockers = [...new Set([...(controlled.blockers || []), ...(activationGate.blockers || [])])];
  const warnings = [...new Set([...(controlled.warnings || []), ...(activationGate.warnings || [])])];
  const ready = controlled.ready === true && activationGate.ready === true;
  return Object.freeze({ ...controlled, ready, decision: ready ? "go" : "no_go", blockers: Object.freeze(blockers), warnings: Object.freeze(warnings), activationGate });
}

async function buildPilotContext(prisma, body = {}) {
  const [state, deploymentReadiness, frozenPreflight] = await Promise.all([
    loadCockpitState(prisma),
    buildDeploymentReadiness(prisma),
    getLatestDeploymentPreflight(prisma)
  ]);
  const cockpit = buildNetworkCockpit(state);
  const recommendations = buildPilotAgencyRecommendations({ agencies: state.agencies, interventionQueue: cockpit.interventionQueue }, { maxAgencies: body.maxAgencies || 3 });
  const agencyIds = Array.isArray(body.agencyIds) && body.agencyIds.length ? body.agencyIds : recommendations.recommendedAgencyIds;
  const plan = buildCampaignPlan(state, { agencyIds, providerKeys: ["google_business_profile"], maxItems: body.maxItems || 10, allowSensitive: body.allowSensitive === true });
  const controlled = evaluateControlledPilot({ deploymentReadiness, plan }, { maxAgencies: body.maxAgencies || 3, maxItems: body.maxItems || 10, minGoogleCoveragePercent: body.minGoogleCoveragePercent || 80, requireNoSensitive: body.requireNoSensitive !== false });
  const activationGate = evaluatePilotActivationGate({ preflight: frozenPreflight, currentReadiness: deploymentReadiness });
  const readiness = mergePilotReadiness(controlled, activationGate);
  return { state, deploymentReadiness, frozenPreflight, recommendations, plan, readiness };
}

function pilotRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/pilot/recommendations", async (req, res) => {
    try {
      const state = await loadCockpitState(prisma);
      const cockpit = buildNetworkCockpit(state);
      const recommendations = buildPilotAgencyRecommendations({ agencies: state.agencies, interventionQueue: cockpit.interventionQueue }, { maxAgencies: req.query?.maxAgencies || 3 });
      return res.json({ ok: true, externalWrite: false, persisted: false, recommendations });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/pilot/preview", async (req, res) => {
    try {
      const context = await buildPilotContext(prisma, req.body || {});
      return res.status(context.readiness.ready ? 200 : 409).json({
        ok: context.readiness.ready,
        externalWrite: false,
        persisted: false,
        readiness: context.readiness,
        recommendations: context.recommendations,
        plan: context.plan,
        frozenPreflight: context.frozenPreflight ? { preflightId: context.frozenPreflight.preflightId, createdAt: context.frozenPreflight.createdAt, status: context.frozenPreflight.status } : null
      });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/pilot/campaign", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour figer la campagne pilote" });
      const context = await buildPilotContext(prisma, req.body || {});
      if (!context.readiness.ready) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Pilot activation gate NO-GO", readiness: context.readiness, recommendations: context.recommendations, plan: context.plan });
      if (req.body?.preflightId && req.body.preflightId !== context.frozenPreflight?.preflightId) return res.status(409).json({ ok: false, error: "Le preflightId fourni ne correspond pas à la dernière preuve figée" });
      const campaign = await createCampaign(prisma, context.plan, req.body?.name || `Pilote Google Presence ${new Date().toISOString().slice(0, 10)}`);
      return res.status(201).json({ ok: true, persisted: true, externalWrite: false, pilot: true, preflightId: context.frozenPreflight?.preflightId || null, campaign, readiness: context.readiness });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });

  return router;
}

module.exports = { pilotRoutes, mergePilotReadiness, buildPilotContext };
