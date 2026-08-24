"use strict";

const express = require("express");
const { getCampaign } = require("./campaign-store");
const { listCampaignExecutions } = require("./campaign-execution-ledger");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildCampaignReport } = require("./campaign-report");
const { getFrozenCampaignReport, freezeCampaignReport } = require("./campaign-report-store");

function campaignReportRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/campaigns/:campaignId/report", async (req, res) => {
    try {
      const campaign = await getCampaign(prisma, req.params.campaignId);
      if (!campaign) return res.status(404).json({ ok: false, error: "Campagne Presence introuvable" });
      const [state, executions, frozen] = await Promise.all([
        loadCockpitState(prisma),
        listCampaignExecutions(prisma, campaign.campaignId),
        getFrozenCampaignReport(prisma, campaign.campaignId)
      ]);
      const live = buildCampaignReport(campaign, state, executions);
      return res.json({
        ok: true,
        persisted: Boolean(frozen),
        frozen: frozen ? { createdAt: frozen.createdAt, report: frozen.report } : null,
        live
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/campaigns/:campaignId/report/freeze", async (req, res) => {
    try {
      if (req.body?.confirm !== true) {
        return res.status(409).json({ ok: false, error: "confirm=true requis pour figer le rapport final Presence" });
      }
      const campaign = await getCampaign(prisma, req.params.campaignId);
      if (!campaign) return res.status(404).json({ ok: false, error: "Campagne Presence introuvable" });
      if (!["completed", "failed"].includes(campaign.status)) {
        return res.status(409).json({ ok: false, error: "Le rapport final ne peut être figé que pour une campagne completed ou failed", status: campaign.status });
      }
      const existing = await getFrozenCampaignReport(prisma, campaign.campaignId);
      if (existing) {
        return res.json({ ok: true, persisted: true, immutable: true, alreadyFrozen: true, createdAt: existing.createdAt, report: existing.report });
      }
      const [state, executions] = await Promise.all([
        loadCockpitState(prisma),
        listCampaignExecutions(prisma, campaign.campaignId)
      ]);
      const report = buildCampaignReport(campaign, state, executions);
      const frozen = await freezeCampaignReport(prisma, campaign.campaignId, report);
      return res.status(201).json({ ok: true, persisted: true, immutable: true, alreadyFrozen: false, createdAt: frozen.createdAt, report: frozen.report });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { campaignReportRoutes };
