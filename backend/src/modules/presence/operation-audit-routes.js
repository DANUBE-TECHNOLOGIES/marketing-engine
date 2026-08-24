"use strict";

const express = require("express");
const { listOperationAudit } = require("./operation-audit");

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

  return router;
}

module.exports = { operationAuditRoutes };
