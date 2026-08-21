"use strict";

const express = require("express");
const { MiniSiteSemanticEngineService } = require("./service");

function errorPayload(error) {
  return {
    ok: false,
    error: error?.code || "MSE_25_40_FAILED",
    message: error?.message || String(error),
    details: error?.details || {},
  };
}

function routes({ prisma, service } = {}) {
  const router = express.Router();
  const semantic = service || new MiniSiteSemanticEngineService({ prisma });

  router.get("/minisite-semantic-engine/health", (_req, res) => {
    res.json({ ok: true, ...semantic.health() });
  });

  router.post("/minisite-semantic-engine/agencies/:agencyId/preview", async (req, res) => {
    try {
      res.json({ ok: true, ...(await semantic.previewAgency({ agencyId: req.params.agencyId })) });
    } catch (error) {
      res.status(error?.status || 500).json(errorPayload(error));
    }
  });

  router.post("/minisite-semantic-engine/network/preview", async (_req, res) => {
    try {
      res.json({ ok: true, ...(await semantic.previewNetwork()) });
    } catch (error) {
      res.status(error?.status || 500).json(errorPayload(error));
    }
  });

  return router;
}

module.exports = { errorPayload, routes };
