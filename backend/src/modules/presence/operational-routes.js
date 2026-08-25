"use strict";

const express = require("express");
const { buildOperationalReadiness } = require("./operational-readiness");
const { buildDeploymentReadiness } = require("./deployment-readiness");

function operationalRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/health/operational-readiness", async (req, res) => {
    try {
      const readiness = await buildOperationalReadiness(prisma);
      return res.status(readiness.readyForGoogleApi ? 200 : 503).json({
        ok: readiness.readyForGoogleApi,
        mode: "read_only",
        externalWritesEnabled: readiness.googleWritesEnabled === true,
        readiness
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/presence/health/deployment-readiness", async (req, res) => {
    try {
      const readiness = await buildDeploymentReadiness(prisma);
      const preflightReady = readiness.pilot.readyForReadOnlyPreflight === true;
      return res.status(preflightReady ? 200 : 503).json({
        ok: preflightReady,
        mode: "read_only_preflight",
        externalWritesPerformed: false,
        googlePilotEnabled: readiness.pilot.readyForGooglePilot === true,
        readiness
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { operationalRoutes };
