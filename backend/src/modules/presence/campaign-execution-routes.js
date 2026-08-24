"use strict";

const express = require("express");
const { executeFrozenCampaign } = require("./campaign-executor");

function campaignExecutionRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/campaigns/:campaignId/execute", async (req, res) => {
    try {
      if (req.body?.confirm !== true) {
        return res.status(409).json({ ok: false, error: "confirm=true requis pour exécuter une campagne Presence" });
      }
      const result = await executeFrozenCampaign(prisma, req.params.campaignId, {
        maxItems: req.body?.maxItems,
        confirmSensitive: req.body?.confirmSensitive === true
      });
      return res.status(result.summary.failed ? 207 : 200).json({ ok: result.summary.failed === 0, externalWrite: result.summary.submitted > 0, ...result });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, readiness: error.readiness || undefined });
    }
  });

  return router;
}

module.exports = { campaignExecutionRoutes };
