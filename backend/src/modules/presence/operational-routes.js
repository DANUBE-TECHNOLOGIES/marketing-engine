"use strict";

const express = require("express");
const { buildOperationalReadiness } = require("./operational-readiness");
const { buildDeploymentReadiness } = require("./deployment-readiness");
const { freezeDeploymentPreflight, listDeploymentPreflights, getLatestDeploymentPreflight } = require("./deployment-preflight-store");
const { evaluatePilotActivationGate } = require("./pilot-activation-gate");

function operationalRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/health/operational-readiness", async (req, res) => {
    try {
      const readiness = await buildOperationalReadiness(prisma);
      return res.status(readiness.readyForGoogleApi ? 200 : 503).json({ ok: readiness.readyForGoogleApi, mode: "read_only", externalWritesEnabled: readiness.googleWritesEnabled === true, readiness });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/health/deployment-readiness", async (req, res) => {
    try {
      const readiness = await buildDeploymentReadiness(prisma);
      const preflightReady = readiness.pilot.readyForReadOnlyPreflight === true;
      const latest = await getLatestDeploymentPreflight(prisma).catch(() => null);
      const activationGate = evaluatePilotActivationGate({ preflight: latest, currentReadiness: readiness });
      return res.status(preflightReady ? 200 : 503).json({ ok: preflightReady, mode: "read_only_preflight", externalWritesPerformed: false, googlePilotEnabled: readiness.pilot.readyForGooglePilot === true, latestFrozenPreflight: latest, activationGate, readiness });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/health/deployment-readiness/freeze", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour figer la preuve de préflight" });
      const readiness = await buildDeploymentReadiness(prisma);
      if (readiness.operational?.googleWritesEnabled === true) return res.status(409).json({ ok: false, error: "Le préflight lecture seule doit être figé avec PRESENCE_GOOGLE_WRITES_ENABLED désactivé" });
      if (readiness.pilot?.readyForReadOnlyPreflight !== true) return res.status(409).json({ ok: false, error: "Le préflight lecture seule n'est pas conforme", blockers: readiness.pilot?.preflightBlockers || [] });
      const frozen = await freezeDeploymentPreflight(prisma, readiness);
      return res.status(201).json({ ok: true, persisted: true, externalWritesPerformed: false, frozen });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/health/deployment-readiness/history", async (req, res) => {
    try {
      const rows = await listDeploymentPreflights(prisma, req.query?.limit);
      return res.json({ ok: true, preflights: rows });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/health/pilot-activation-gate", async (req, res) => {
    try {
      const [readiness, latest] = await Promise.all([buildDeploymentReadiness(prisma), getLatestDeploymentPreflight(prisma)]);
      const gate = evaluatePilotActivationGate({ preflight: latest, currentReadiness: readiness });
      return res.status(gate.ready ? 200 : 409).json({ ok: gate.ready, gate });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  return router;
}

module.exports = { operationalRoutes };
