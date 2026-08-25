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
const { evaluateNetworkRolloutGate } = require("./network-rollout-gate");

function normalizeRolloutStage(value) {
  const stage = Number(value || 0);
  return [50, 100].includes(stage) ? stage : null;
}

function mergePilotReadiness(controlled, activationGate, extensionGate = null, rolloutGate = null, requestedRolloutStage = null) {
  const rolloutBlockers = [];
  if (requestedRolloutStage) {
    if (!rolloutGate?.ready) rolloutBlockers.push(...(rolloutGate?.blockers || ["network_rollout_gate_no_go"]));
    if (rolloutGate?.ready && rolloutGate.nextStagePercent !== requestedRolloutStage) rolloutBlockers.push("network_rollout_stage_not_authorized");
  }
  const blockers = [...new Set([...(controlled.blockers || []), ...(activationGate.blockers || []), ...((extensionGate && !extensionGate.ready) ? extensionGate.blockers || [] : []), ...rolloutBlockers])];
  const warnings = [...new Set([...(controlled.warnings || []), ...(activationGate.warnings || []), ...(extensionGate?.warnings || [])])];
  const ready = controlled.ready === true && activationGate.ready === true && (!extensionGate || extensionGate.ready === true) && rolloutBlockers.length === 0;
  return Object.freeze({ ...controlled, ready, decision: ready ? "go" : "no_go", blockers: Object.freeze(blockers), warnings: Object.freeze(warnings), activationGate, extensionGate, rolloutGate, requestedRolloutStage });
}

async function buildPilotContext(prisma, body = {}) {
  const requestedRolloutStage = normalizeRolloutStage(body.rolloutStage);
  const extended = body.extended === true && !requestedRolloutStage;
  const [state, deploymentReadiness, frozenPreflight] = await Promise.all([
    loadCockpitState(prisma),
    buildDeploymentReadiness(prisma),
    getLatestDeploymentPreflight(prisma)
  ]);
  const [extensionGate, rolloutGate] = await Promise.all([
    extended ? evaluatePilotExtensionGate(prisma) : Promise.resolve(null),
    requestedRolloutStage ? evaluateNetworkRolloutGate(prisma, state.agencies.length) : Promise.resolve(null)
  ]);
  const maxAgencies = requestedRolloutStage ? Math.max(1, Number(rolloutGate?.maxAgencies || 1)) : extended ? 3 : 1;
  const maxItems = requestedRolloutStage ? maxAgencies : extended ? 3 : 1;
  const cockpit = buildNetworkCockpit(state);
  const recommendations = buildPilotAgencyRecommendations({ agencies: state.agencies, interventionQueue: cockpit.interventionQueue }, { maxAgencies });
  const agencyIds = Array.isArray(body.agencyIds) && body.agencyIds.length ? body.agencyIds.slice(0, maxAgencies) : recommendations.recommendedAgencyIds;
  const plan = buildCampaignPlan(state, { agencyIds, providerKeys: ["google_business_profile"], maxItems, allowSensitive: false });
  const controlled = evaluateControlledPilot({ deploymentReadiness, plan }, { maxAgencies, maxItems, minGoogleCoveragePercent: body.minGoogleCoveragePercent || 80, requireNoSensitive: true });
  const activationGate = evaluatePilotActivationGate({ preflight: frozenPreflight, currentReadiness: deploymentReadiness });
  const readiness = mergePilotReadiness(controlled, activationGate, extensionGate, rolloutGate, requestedRolloutStage);
  if (!requestedRolloutStage && !extended) {
    const canaryBlockers = [];
    const planAgencyCount = Array.isArray(plan.policy?.agencyIds) ? plan.policy.agencyIds.length : 0;
    if (planAgencyCount !== 1) canaryBlockers.push("canary_requires_exactly_one_agency");
    if (plan.selectedCount !== 1 || plan.executableCount !== 1) canaryBlockers.push("canary_requires_exactly_one_executable_item");
    if (canaryBlockers.length) {
      const blockers = [...new Set([...(readiness.blockers || []), ...canaryBlockers])];
      return { state, deploymentReadiness, frozenPreflight, recommendations, plan, extended, extensionGate, rolloutGate, requestedRolloutStage, readiness: Object.freeze({ ...readiness, ready: false, decision: "no_go", blockers: Object.freeze(blockers) }) };
    }
  }
  return { state, deploymentReadiness, frozenPreflight, recommendations, plan, readiness, extended, extensionGate, rolloutGate, requestedRolloutStage };
}

function sourceEvidenceForContext(context) {
  if (context.requestedRolloutStage) {
    const stage = context.rolloutGate?.stages?.[context.rolloutGate.stages.length - 1] || null;
    return stage ? { campaignId: stage.campaignId || null, reportId: stage.reportId || null, reportCreatedAt: stage.reportCreatedAt || null } : null;
  }
  if (context.extended && context.extensionGate) {
    return { campaignId: context.extensionGate.canaryCampaignId || null, reportId: context.extensionGate.reportId || null, reportCreatedAt: context.extensionGate.reportCreatedAt || null };
  }
  return null;
}

function pilotRoutes({ prisma }) {
  const router = express.Router();
  router.get("/api/presence/pilot/extension-gate", async (req, res) => {
    try { const gate = await evaluatePilotExtensionGate(prisma); return res.status(gate.ready ? 200 : 409).json({ ok: gate.ready, externalWrite: false, persisted: false, gate }); }
    catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });
  router.get("/api/presence/pilot/network-rollout-gate", async (req, res) => {
    try { const state = await loadCockpitState(prisma); const gate = await evaluateNetworkRolloutGate(prisma, state.agencies.length); return res.status(gate.ready ? 200 : 409).json({ ok: gate.ready, externalWrite: false, persisted: false, agencyCount: state.agencies.length, gate }); }
    catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });
  router.get("/api/presence/pilot/recommendations", async (req, res) => {
    try {
      const requestedRolloutStage = normalizeRolloutStage(req.query?.rolloutStage);
      const extended = req.query?.extended === "true" && !requestedRolloutStage;
      const state = await loadCockpitState(prisma);
      let maxAgencies = extended ? 3 : 1;
      let gate = null;
      if (extended) { gate = await evaluatePilotExtensionGate(prisma); if (!gate.ready) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Pilot extension gate NO-GO", gate }); }
      if (requestedRolloutStage) { gate = await evaluateNetworkRolloutGate(prisma, state.agencies.length); if (!gate.ready || gate.nextStagePercent !== requestedRolloutStage) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Network rollout gate NO-GO", gate }); maxAgencies = gate.maxAgencies; }
      const cockpit = buildNetworkCockpit(state);
      const recommendations = buildPilotAgencyRecommendations({ agencies: state.agencies, interventionQueue: cockpit.interventionQueue }, { maxAgencies });
      return res.json({ ok: true, externalWrite: false, persisted: false, extended, rolloutStage: requestedRolloutStage, maxAgencies, gate, recommendations });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });
  router.post("/api/presence/pilot/preview", async (req, res) => {
    try {
      const context = await buildPilotContext(prisma, req.body || {});
      return res.status(context.readiness.ready ? 200 : 409).json({ ok: context.readiness.ready, externalWrite: false, persisted: false, extended: context.extended, rolloutStage: context.requestedRolloutStage, readiness: context.readiness, recommendations: context.recommendations, plan: context.plan, sourceEvidence: sourceEvidenceForContext(context), extensionGate: context.extensionGate, rolloutGate: context.rolloutGate, frozenPreflight: context.frozenPreflight ? { preflightId: context.frozenPreflight.preflightId, createdAt: context.frozenPreflight.createdAt, status: context.frozenPreflight.status } : null });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });
  router.post("/api/presence/pilot/campaign", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour figer la campagne pilote" });
      const context = await buildPilotContext(prisma, req.body || {});
      if (!context.readiness.ready) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Pilot activation gate NO-GO", readiness: context.readiness, extensionGate: context.extensionGate, rolloutGate: context.rolloutGate, recommendations: context.recommendations, plan: context.plan });
      if (req.body?.preflightId && req.body.preflightId !== context.frozenPreflight?.preflightId) return res.status(409).json({ ok: false, error: "Le preflightId fourni ne correspond pas à la dernière preuve figée" });
      const sourceEvidence = sourceEvidenceForContext(context);
      if ((context.extended || context.requestedRolloutStage) && (!sourceEvidence?.campaignId || !sourceEvidence?.reportId || !sourceEvidence?.reportCreatedAt)) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Source evidence incomplete for promotion" });
      const approvedScope = {
        agencyIds: context.plan.policy?.agencyIds || [],
        providerKeys: context.plan.policy?.providerKeys || [],
        maxItems: context.plan.policy?.maxItems || 0,
        allowSensitive: false,
        rolloutStage: context.requestedRolloutStage || null,
        sourceEvidenceCampaignId: sourceEvidence?.campaignId || null,
        sourceEvidenceReportId: sourceEvidence?.reportId || null,
        sourceEvidenceReportCreatedAt: sourceEvidence?.reportCreatedAt || null
      };
      const approvedPlanFingerprint = stableId({ approvedScope, selected: context.plan.selected || [] });
      const defaultName = context.requestedRolloutStage ? `Rollout ${context.requestedRolloutStage}% Google Presence ${new Date().toISOString().slice(0, 10)}` : `${context.extended ? "Pilote étendu" : "Canari"} Google Presence ${new Date().toISOString().slice(0, 10)}`;
      const campaign = await createCampaign(prisma, context.plan, req.body?.name || defaultName, { pilot: true, preflightId: context.frozenPreflight?.preflightId || null, approvedScope, approvedPlanFingerprint });
      return res.status(201).json({ ok: true, persisted: true, externalWrite: false, pilot: true, extended: context.extended, rolloutStage: context.requestedRolloutStage, preflightId: context.frozenPreflight?.preflightId || null, approvedScope, approvedPlanFingerprint, sourceEvidence, campaign, readiness: context.readiness });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });
  return router;
}

module.exports = { pilotRoutes, mergePilotReadiness, buildPilotContext, normalizeRolloutStage, sourceEvidenceForContext };
