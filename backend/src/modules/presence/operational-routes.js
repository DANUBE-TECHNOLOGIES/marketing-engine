"use strict";

const express = require("express");
const { buildOperationalReadiness } = require("./operational-readiness");
const { buildDeploymentReadiness } = require("./deployment-readiness");

function operationalRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/health/operational-readiness", async (req, res) => {
    try {
      const readiness = await buildOperationalReadiness(prisma);
      return res.status(readiness.readyForGoogleManagedWrites ? 200 : 503).json({ ok: readiness.readyForGoogleManagedWrites, readiness });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/presence/health/deployment-readiness", async (req, res) => {
    try {
      const readiness = await buildDeploymentReadiness(prisma);
      return res.status(readiness.pilot.readyForGooglePilot ? 200 : 503).json({ ok: readiness.pilot.readyForGooglePilot, readiness });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { operationalRoutes };
