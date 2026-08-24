"use strict";

const express = require("express");
const { getCampaign } = require("./campaign-store");
const { listCampaignExecutions } = require("./campaign-execution-ledger");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildCampaignReport } = require("./campaign-report");

function campaignReportRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/campaigns/:campaignId/report", async (req, res) => {
    try {
      const campaign = await getCampaign(prisma, req.params.campaignId);
      if (!campaign) return res.status(404).json({ ok: false, error: "Campagne Presence introuvable" });
      const [state, executions] = await Promise.all([
        loadCockpitState(prisma),
        listCampaignExecutions(prisma, campaign.campaignId)
      ]);
      const report = buildCampaignReport(campaign, state, executions);
      return res.json({ ok: true, persisted: false, report });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { campaignReportRoutes };
