"use strict";

const express = require("express");
const { getCampaign, createCampaign } = require("./campaign-store");
const { listCampaignExecutions } = require("./campaign-execution-ledger");
const { getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildNetworkCockpit } = require("./network-cockpit");
const { stableId } = require("./campaign-planner");
const { buildRecoveryPlan, evaluateRecoveryEligibility } = require("./campaign-recovery");

async function buildRecoveryContext(prisma, campaignId) {
  const sourceCampaign = await getCampaign(prisma, campaignId);
  if (!sourceCampaign) { const error = new Error("Campagne Presence introuvable"); error.status = 404; throw error; }
  const [executions, latestPreflight, deploymentReadiness, state] = await Promise.all([
    listCampaignExecutions(prisma, campaignId),
    getLatestDeploymentPreflight(prisma),
    buildDeploymentReadiness(prisma),
    loadCockpitState(prisma)
  ]);
  const eligibility = evaluateRecoveryEligibility(sourceCampaign, executions, latestPreflight);
  const activationGate = evaluatePilotActivationGate({ preflight: latestPreflight, currentReadiness: deploymentReadiness });
  const cockpit = buildNetworkCockpit(state);
  const plan = buildRecoveryPlan(sourceCampaign, cockpit, executions, latestPreflight?.preflightId || null);
  const blockers = [...new Set([...(eligibility.blockers || []), ...(activationGate.blockers || [])])];
  if (!plan.executableCount) blockers.push("no_untouched_items_to_recover");
  const ready = blockers.length === 0;
  return { sourceCampaign, executions, latestPreflight, deploymentReadiness, eligibility, activationGate, plan, readiness: { ready, decision: ready ? "go" : "no_go", blockers } };
}

function campaignRecoveryRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/campaigns/:campaignId/recovery-preview", async (req, res) => {
    try {
      const context = await buildRecoveryContext(prisma, req.params.campaignId);
      return res.status(context.readiness.ready ? 200 : 409).json({
        ok: context.readiness.ready,
        externalWrite: false,
        persisted: false,
        recoveryOfCampaignId: context.sourceCampaign.campaignId,
        preflightId: context.latestPreflight?.preflightId || null,
        readiness: context.readiness,
        eligibility: context.eligibility,
        activationGate: context.activationGate,
        plan: context.plan
      });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/campaigns/:campaignId/recovery", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour créer une campagne de reprise" });
      const context = await buildRecoveryContext(prisma, req.params.campaignId);
      if (!context.readiness.ready) return res.status(409).json({ ok: false, externalWrite: false, persisted: false, error: "Recovery gate NO-GO", ...context.readiness, eligibility: context.eligibility, activationGate: context.activationGate });
      const source = context.sourceCampaign.approvedScope || {};
      const approvedScope = {
        agencyIds: context.plan.policy.agencyIds,
        providerKeys: context.plan.policy.providerKeys,
        maxItems: context.plan.policy.maxItems,
        allowSensitive: false,
        rolloutStage: source.rolloutStage || null,
        sourceEvidenceCampaignId: source.sourceEvidenceCampaignId || null,
        sourceEvidenceReportId: source.sourceEvidenceReportId || null,
        sourceEvidenceReportCreatedAt: source.sourceEvidenceReportCreatedAt || null,
        recoveryOfCampaignId: context.sourceCampaign.campaignId
      };
      const approvedPlanFingerprint = stableId({ approvedScope, selected: context.plan.selected || [] });
      const campaign = await createCampaign(prisma, context.plan, req.body?.name || `Reprise ${context.sourceCampaign.name || context.sourceCampaign.campaignId}`, {
        pilot: true,
        preflightId: context.latestPreflight.preflightId,
        approvedScope,
        approvedPlanFingerprint
      });
      return res.status(201).json({ ok: true, persisted: true, externalWrite: false, recovery: true, recoveryOfCampaignId: context.sourceCampaign.campaignId, campaign, approvedScope, approvedPlanFingerprint });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });

  return router;
}

module.exports = { campaignRecoveryRoutes, buildRecoveryContext };
