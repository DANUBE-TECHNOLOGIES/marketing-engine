"use strict";

const express = require("express");
const { loadCockpitState } = require("./network-cockpit-routes");
const { buildCampaignPlan } = require("./campaign-planner");

function campaignRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/campaigns/preview", async (req, res) => {
    try {
      const state = await loadCockpitState(prisma);
      const plan = buildCampaignPlan(state, {
        agencyIds: req.body?.agencyIds,
        providerKeys: req.body?.providerKeys,
        maxItems: req.body?.maxItems,
        allowSensitive: req.body?.allowSensitive === true
      });
      return res.json({ ok: true, persisted: false, executable: false, plan });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { campaignRoutes };
