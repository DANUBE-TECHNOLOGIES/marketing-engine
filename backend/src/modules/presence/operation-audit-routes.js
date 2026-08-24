"use strict";

const express = require("express");
const { listOperationAudit } = require("./operation-audit");
const { listOperationSnapshots, summarizePropagation } = require("./operation-snapshots");
const { listPendingPropagation } = require("./propagation-watch");

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

  router.get("/api/presence/propagation-pending", async (req, res) => {
    try {
      const rows = await listPendingPropagation(prisma, {
        limit: req.query.limit,
        providerKey: req.query.providerKey || "google_business_profile",
        warnAfterMs: req.query.warnAfterMs,
        staleAfterMs: req.query.staleAfterMs
      });
      const summary = rows.reduce((acc, row) => {
        acc.total += 1;
        acc[row.propagation.state] = (acc[row.propagation.state] || 0) + 1;
        return acc;
      }, { total: 0, normal: 0, slow: 0, stale: 0, unknown: 0 });
      return res.json({ ok: true, summary, rows });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { operationAuditRoutes };
