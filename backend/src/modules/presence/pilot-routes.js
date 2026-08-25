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

const CANARY_MAX_AGENCIES = 1;
const CANARY_MAX_ITEMS = 1;

function mergePilotReadiness(controlled, activationGate, plan) {
  const blockers = [...new Set([...(controlled.blockers || []), ...(activationGate.blockers || [])])];
  const warnings = [...new Set([...(controlled.warnings || []), ...(activationGate.warnings || [])])];
  if (plan?.selectedCount !== 1) blockers.push("canary_requires_exactly_one_item");
  if (plan?.executableCount !== 1) blockers.push("canary_requires_exactly_one_executable_item");
  const ready = controlled.ready === true && activationGate.ready === true && blockers.length === 0;
  return Object.freeze({ ...controlled, ready, decision: ready ? "go" : "no_go", blockers: Object.freeze([...new Set(blockers)]), warnings: Object.freeze(warnings), activationGate, pilotPhase: "canary", canaryPolicy: Object.freeze({ maxAgencies: CANARY_MAX_AGENCIES, maxItems: CANARY_MAX_ITEMS }) });
}

async function buildPilotContext(prisma, body = {}) {
  const [state, deploymentReadiness, frozenPreflight] = await Promise.all([loadCockpitState(prisma), buildDeploymentReadiness(prisma), getLatestDeploymentPreflight(prisma)]);
  const cockpit = buildNetworkCockpit(state);
  const recommendations = buildPilotAgencyRecommendations({ agencies: state.agencies, interventionQueue: cockpit.interventionQueue }, { maxAgencies: CANARY_MAX_AGENCIES });
  const requestedAgencyIds = Array.isArray(body.agencyIds) ? body.agencyIds : [];
  const agencyIds = requestedAgencyIds.length ? requestedAgencyIds.slice(0, CANARY_MAX_AGENCIES) : recommendations.recommendedAgencyIds.slice(0, CANARY_MAX_AGENCIES);
  const plan = buildCampaignPlan(state, { agencyIds, providerKeys: ["google_business_profile"], maxItems: CANARY_MAX_ITEMS, allowSensitive: false });
  const controlled = evaluateControlledPilot({ deploymentReadiness, plan }, { maxAgencies: CANARY_MAX_AGENCIES, maxItems: CANARY_MAX_ITEMS, minGoogleCoveragePercent: body.minGoogleCoveragePercent || 80, requireNoSensitive: true });
  const activationGate = evaluatePilotActivationGate({ preflight: frozenPreflight, currentReadiness: deploymentReadiness });
  const readiness = mergePilotReadiness(controlled, activationGate, plan);
  return { state, deploymentReadiness, frozenPreflight, recommendations, plan, readiness };
}

function pilotRoutes({ prisma }) {
  const router = express.Router();
  router.get("/api/presence/pilot/recommendations", async (req, res) => {
    try { const state = await loadCockpitState(prisma); const cockpit = buildNetworkCockpit(state); const recommendations = buildPilotAgencyRecommendations({ agencies: state.agencies, interventionQueue: cockpit.interventionQueue }, { maxAgencies: CANARY_MAX_AGENCIES }); return res.json({ ok: true, externalWrite: false, persisted: false, pilotPhase: "canary", recommendations }); }
    catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });
  router.post("/api/presence/pilot/preview", async (req, res) => {
    try { const context = await buildPilotContext(prisma, req.body || {}); return res.status(context.readiness.ready ? 200 : 409).json({ ok: context.readiness.ready, externalWrite: false, persisted: false, pilotPhase: "canary", readiness: context.readiness, recommendations: context.recommendations, plan: context.plan, frozenPreflight: context.frozenPreflight ? { preflightId: context.frozenPreflight.preflightId, createdAt: context.frozenPreflight.createdAt, status: context.frozenPreflight.status } : null }); }
    catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });
  router.post("/api/presence/pilot/campaign", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour figer la campagne pilote" });
      const context = await buildPilotContext(prisma, req.body || {});
      if (!context.readiness.ready) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Pilot activation gate NO-GO", readiness: context.readiness, recommendations: context.recommendations, plan: context.plan });
      if (req.body?.preflightId && req.body.preflightId !== context.frozenPreflight?.preflightId) return res.status(409).json({ ok: false, error: "Le preflightId fourni ne correspond pas à la dernière preuve figée" });
      const approvedScope = { agencyIds: context.plan.policy?.agencyIds || [], providerKeys: context.plan.policy?.providerKeys || [], maxItems: context.plan.policy?.maxItems || 0, allowSensitive: false, pilotPhase: "canary" };
      const approvedPlanFingerprint = stableId({ approvedScope, selected: context.plan.selected || [] });
      const campaign = await createCampaign(prisma, context.plan, req.body?.name || `Pilote canari Google Presence ${new Date().toISOString().slice(0, 10)}`, { pilot: true, pilotPhase: "canary", preflightId: context.frozenPreflight?.preflightId || null, approvedScope, approvedPlanFingerprint });
      return res.status(201).json({ ok: true, persisted: true, externalWrite: false, pilot: true, pilotPhase: "canary", preflightId: context.frozenPreflight?.preflightId || null, approvedScope, approvedPlanFingerprint, campaign, readiness: context.readiness });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });
  return router;
}

module.exports = { CANARY_MAX_AGENCIES, CANARY_MAX_ITEMS, pilotRoutes, mergePilotReadiness, buildPilotContext };
