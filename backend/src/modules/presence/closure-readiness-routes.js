"use strict";

const express = require("express");
const { buildPresenceClosureReadiness } = require("./closure-readiness");

function closureReadinessRoutes({ prisma }) {
  const router = express.Router();
  router.get("/api/presence/closure-readiness", async (req, res) => {
    try {
      const readiness = await buildPresenceClosureReadiness(prisma);
      return res.json({ ok: true, externalWrite: false, immutable: false, ...readiness });
    } catch (error) {
      return res.status(500).json({ ok: false, externalWrite: false, error: error.message });
    }
  });
  return router;
}

module.exports = { closureReadinessRoutes };
