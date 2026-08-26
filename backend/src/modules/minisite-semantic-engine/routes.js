"use strict";

const express = require("express");
const { MiniSiteSemanticEngineService } = require("./service");
const { buildPostRollbackRuntimeStatus } = require("./post-rollback-runtime-status");
const { buildOperationalRuntimeStatus } = require("./operational-runtime-status");

function errorPayload(error) {
  return {
    ok: false,
    error: error?.code || "MSE_25_40_FAILED",
    message: error?.message || String(error),
    details: error?.details || {},
  };
}

function tenantSlugFrom(req) {
  return String(req.get("x-tenant-slug") || req.tenant?.slug || "mondescale").trim();
}

function routes({ prisma, service } = {}) {
  const router = express.Router();
  const semantic = service || new MiniSiteSemanticEngineService({ prisma });

  router.get("/minisite-semantic-engine/health", (_req, res) => {
    res.json({ ok: true, ...semantic.health() });
  });

  router.get("/minisite-semantic-engine/operational-status", (_req, res) => {
    try {
      const payload = buildOperationalRuntimeStatus();
      res.status(payload.ok ? 200 : 503).json(payload);
    } catch (error) {
      res.status(500).json({
        ...errorPayload(error),
        type: "MSE_25_OPERATIONAL_RUNTIME_STATUS",
        readOnly: true,
        writes: false,
        publicWrites: false,
      });
    }
  });

  router.get("/minisite-semantic-engine/post-rollback-status", (_req, res) => {
    try {
      const payload = buildPostRollbackRuntimeStatus();
      res.status(payload.ok ? 200 : 503).json(payload);
    } catch (error) {
      res.status(500).json({
        ...errorPayload(error),
        type: "POST_ROLLBACK_RUNTIME_STATUS",
        readOnly: true,
        writes: false,
        publicWrites: false,
      });
    }
  });

  router.post("/minisite-semantic-engine/agencies/:agencyId/preview", async (req, res) => {
    try {
      res.json({
        ok: true,
        ...(await semantic.previewAgency({
          agencyId: req.params.agencyId,
          tenantSlug: tenantSlugFrom(req),
        })),
      });
    } catch (error) {
      res.status(error?.status || 500).json(errorPayload(error));
    }
  });

  router.post("/minisite-semantic-engine/network/preview", async (req, res) => {
    try {
      res.json({
        ok: true,
        ...(await semantic.previewNetwork({ tenantSlug: tenantSlugFrom(req) })),
      });
    } catch (error) {
      res.status(error?.status || 500).json(errorPayload(error));
    }
  });

  return router;
}

module.exports = { errorPayload, routes, tenantSlugFrom };
