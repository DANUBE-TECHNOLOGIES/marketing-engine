"use strict";

const express = require("express");
const { getCampaign } = require("./campaign-store");
const { listCampaignExecutions } = require("./campaign-execution-ledger");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildCampaignReport } = require("./campaign-report");
const { getFrozenCampaignReport, freezeCampaignReport } = require("./campaign-report-store");
const { evaluatePilotOutcome } = require("./pilot-outcome");

function criticalAlerts(state) {
  return (state.propagationAlerts || []).filter((item) => item.severity === "critical").length;
}

function embeddedCriticalAlerts(report) {
  return Number(report?.pilotEvidence?.criticalPropagationAlerts ?? 0);
}

async function predecessorReportForCampaign(prisma, campaign) {
  const sourceCampaignId = campaign?.approvedScope?.sourceEvidenceCampaignId || null;
  if (!sourceCampaignId) return null;
  const frozen = await getFrozenCampaignReport(prisma, sourceCampaignId);
  return frozen?.report || null;
}

function campaignReportRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/campaigns/:campaignId/report", async (req, res) => {
    try {
      const campaign = await getCampaign(prisma, req.params.campaignId);
      if (!campaign) return res.status(404).json({ ok: false, error: "Campagne Presence introuvable" });
      const [state, executions, frozen, predecessorReport] = await Promise.all([
        loadCockpitState(prisma),
        listCampaignExecutions(prisma, campaign.campaignId),
        getFrozenCampaignReport(prisma, campaign.campaignId),
        predecessorReportForCampaign(prisma, campaign)
      ]);
      const currentCriticalAlerts = criticalAlerts(state);
      const live = buildCampaignReport(campaign, state, executions, { criticalPropagationAlerts: currentCriticalAlerts, predecessorReport });
      const official = frozen?.report || live;
      const rollout = evaluatePilotOutcome(official, { criticalPropagationAlerts: frozen ? embeddedCriticalAlerts(official) : currentCriticalAlerts });
      return res.json({ ok: true, persisted: Boolean(frozen), frozen: frozen ? { createdAt: frozen.createdAt, report: frozen.report } : null, live, rollout });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/campaigns/:campaignId/report/freeze", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour figer le rapport final Presence" });
      const campaign = await getCampaign(prisma, req.params.campaignId);
      if (!campaign) return res.status(404).json({ ok: false, error: "Campagne Presence introuvable" });
      if (!["completed", "failed"].includes(campaign.status)) return res.status(409).json({ ok: false, error: "Le rapport final ne peut être figé que pour une campagne completed ou failed", status: campaign.status });
      const existing = await getFrozenCampaignReport(prisma, campaign.campaignId);
      if (existing) return res.json({ ok: true, persisted: true, immutable: true, alreadyFrozen: true, createdAt: existing.createdAt, report: existing.report, rollout: evaluatePilotOutcome(existing.report, { criticalPropagationAlerts: embeddedCriticalAlerts(existing.report) }) });
      const [state, executions, predecessorReport] = await Promise.all([
        loadCockpitState(prisma),
        listCampaignExecutions(prisma, campaign.campaignId),
        predecessorReportForCampaign(prisma, campaign)
      ]);
      const criticalPropagationAlerts = criticalAlerts(state);
      const report = buildCampaignReport(campaign, state, executions, { criticalPropagationAlerts, predecessorReport });
      const frozen = await freezeCampaignReport(prisma, campaign.campaignId, report);
      const rollout = evaluatePilotOutcome(frozen.report, { criticalPropagationAlerts: embeddedCriticalAlerts(frozen.report) });
      return res.status(201).json({ ok: true, persisted: true, immutable: true, alreadyFrozen: false, createdAt: frozen.createdAt, report: frozen.report, rollout });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  return router;
}

module.exports = { campaignReportRoutes, criticalAlerts, embeddedCriticalAlerts, predecessorReportForCampaign };
