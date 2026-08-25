"use strict";

const express = require("express");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildNetworkCockpit } = require("./network-cockpit");
const { buildCampaignPlan, stableId } = require("./campaign-planner");
const { createCampaign } = require("./campaign-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluateControlledPilot } = require("./pilot-readiness");
const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { buildPilotAgencyRecommendations } = require("./pilot-selector");
const { evaluatePilotExtensionGate } = require("./pilot-extension-gate");

function mergePilotReadiness(controlled, activationGate, extensionGate = null) {
  const blockers = [...new Set([...(controlled.blockers || []), ...(activationGate.blockers || []), ...((extensionGate && !extensionGate.ready) ? extensionGate.blockers || [] : [])])];
  const warnings = [...new Set([...(controlled.warnings || []), ...(activationGate.warnings || []), ...(extensionGate?.warnings || [])])];
  const ready = controlled.ready === true && activationGate.ready === true && (!extensionGate || extensionGate.ready === true);
  return Object.freeze({ ...controlled, ready, decision: ready ? "go" : "no_go", blockers: Object.freeze(blockers), warnings: Object.freeze(warnings), activationGate, extensionGate });
}

async function buildPilotContext(prisma, body = {}) {
  const extended = body.extended === true;
  const maxAgencies = extended ? Math.max(2, Math.min(Number(body.maxAgencies || 3), 3)) : 1;
  const maxItems = extended ? Math.max(2, Math.min(Number(body.maxItems || 3), 3)) : 1;
  const [state, deploymentReadiness, frozenPreflight, extensionGate] = await Promise.all([
    loadCockpitState(prisma),
    buildDeploymentReadiness(prisma),
    getLatestDeploymentPreflight(prisma),
    extended ? evaluatePilotExtensionGate(prisma) : Promise.resolve(null)
  ]);
  const cockpit = buildNetworkCockpit(state);
  const recommendations = buildPilotAgencyRecommendations({ agencies: state.agencies, interventionQueue: cockpit.interventionQueue }, { maxAgencies });
  const agencyIds = Array.isArray(body.agencyIds) && body.agencyIds.length ? body.agencyIds : recommendations.recommendedAgencyIds;
  const plan = buildCampaignPlan(state, { agencyIds, providerKeys: ["google_business_profile"], maxItems, allowSensitive: false });
  const controlled = evaluateControlledPilot({ deploymentReadiness, plan }, { maxAgencies, maxItems, minGoogleCoveragePercent: body.minGoogleCoveragePercent || 80, requireNoSensitive: true });
  const activationGate = evaluatePilotActivationGate({ preflight: frozenPreflight, currentReadiness: deploymentReadiness });
  const readiness = mergePilotReadiness(controlled, activationGate, extensionGate);
  return { state, deploymentReadiness, frozenPreflight, recommendations, plan, readiness, extended, extensionGate };
}

function pilotRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/pilot/extension-gate", async (req, res) => {
    try {
      const gate = await evaluatePilotExtensionGate(prisma);
      return res.status(gate.ready ? 200 : 409).json({ ok: gate.ready, externalWrite: false, persisted: false, gate });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/pilot/recommendations", async (req, res) => {
    try {
      const extended = req.query?.extended === "true";
      if (extended) {
        const gate = await evaluatePilotExtensionGate(prisma);
        if (!gate.ready) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Pilot extension gate NO-GO", gate });
      }
      const state = await loadCockpitState(prisma);
      const cockpit = buildNetworkCockpit(state);
      const recommendations = buildPilotAgencyRecommendations({ agencies: state.agencies, interventionQueue: cockpit.interventionQueue }, { maxAgencies: extended ? 3 : 1 });
      return res.json({ ok: true, externalWrite: false, persisted: false, extended, recommendations });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/pilot/preview", async (req, res) => {
    try {
      const context = await buildPilotContext(prisma, req.body || {});
      return res.status(context.readiness.ready ? 200 : 409).json({ ok: context.readiness.ready, externalWrite: false, persisted: false, extended: context.extended, readiness: context.readiness, recommendations: context.recommendations, plan: context.plan, extensionGate: context.extensionGate, frozenPreflight: context.frozenPreflight ? { preflightId: context.frozenPreflight.preflightId, createdAt: context.frozenPreflight.createdAt, status: context.frozenPreflight.status } : null });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/pilot/campaign", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour figer la campagne pilote" });
      const context = await buildPilotContext(prisma, req.body || {});
      if (!context.readiness.ready) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Pilot activation gate NO-GO", readiness: context.readiness, extensionGate: context.extensionGate, recommendations: context.recommendations, plan: context.plan });
      if (req.body?.preflightId && req.body.preflightId !== context.frozenPreflight?.preflightId) return res.status(409).json({ ok: false, error: "Le preflightId fourni ne correspond pas à la dernière preuve figée" });
      const approvedScope = { agencyIds: context.plan.policy?.agencyIds || [], providerKeys: context.plan.policy?.providerKeys || [], maxItems: context.plan.policy?.maxItems || 0, allowSensitive: false };
      const approvedPlanFingerprint = stableId({ approvedScope, selected: context.plan.selected || [] });
      const campaign = await createCampaign(prisma, context.plan, req.body?.name || `${context.extended ? "Pilote étendu" : "Canari"} Google Presence ${new Date().toISOString().slice(0, 10)}`, { pilot: true, preflightId: context.frozenPreflight?.preflightId || null, approvedScope, approvedPlanFingerprint });
      return res.status(201).json({ ok: true, persisted: true, externalWrite: false, pilot: true, extended: context.extended, preflightId: context.frozenPreflight?.preflightId || null, approvedScope, approvedPlanFingerprint, sourceCanaryCampaignId: context.extensionGate?.canaryCampaignId || null, campaign, readiness: context.readiness });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });

  return router;
}

module.exports = { pilotRoutes, mergePilotReadiness, buildPilotContext };
