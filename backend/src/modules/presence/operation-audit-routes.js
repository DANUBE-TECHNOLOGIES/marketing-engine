"use strict";

const express = require("express");
const { listOperationAudit } = require("./operation-audit");
const { listOperationSnapshots, summarizePropagation } = require("./operation-snapshots");

function operationAuditRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/operations", async (req, res) => {
    try {
      const rows = await listOperationAudit(prisma, {
        limit: req.query.limit,
        agencyId: req.query.agencyId,
        providerKey: req.query.providerKey,
        operationId: req.query.operationId
      });
      return res.json({ ok: true, total: rows.length, rows });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/presence/operation-snapshots", async (req, res) => {
    try {
      const rows = await listOperationSnapshots(prisma, {
        limit: req.query.limit,
        agencyId: req.query.agencyId,
        providerKey: req.query.providerKey,
        operationId: req.query.operationId
      });
      return res.json({ ok: true, total: rows.length, rows });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/presence/propagation-metrics", async (req, res) => {
    try {
      const metrics = await summarizePropagation(prisma, req.query.providerKey || null);
      return res.json({ ok: true, providerKey: req.query.providerKey || null, metrics });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { operationAuditRoutes };
