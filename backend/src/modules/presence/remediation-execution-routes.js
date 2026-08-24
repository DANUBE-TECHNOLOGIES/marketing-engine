"use strict";

const express = require("express");
const { buildGoogleRemediationPatch, patchGoogleLocation, verifyGoogleRemediation } = require("./google-remediation");

async function loadAgency(prisma, rawAgencyId) {
  const agencyId = Number(rawAgencyId);
  if (!Number.isInteger(agencyId) || agencyId <= 0) {
    const error = new Error("agencyId invalide");
    error.status = 400;
    throw error;
  }
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) {
    const error = new Error("Agence introuvable");
    error.status = 404;
    throw error;
  }
  return agency;
}

function parseDrift(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function remediationExecutionRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/agencies/:agencyId/google/remediation/preview", async (req, res) => {
    try {
      const agency = await loadAgency(prisma, req.params.agencyId);
      const patch = buildGoogleRemediationPatch(agency, parseDrift(req.body?.drift));
      if (!patch.updateMask.length) return res.status(409).json({ ok: false, error: "Aucun champ NAP Google supporté à corriger" });
      return res.json({ ok: true, persisted: false, externalWrite: false, patch });
    } catch (error) {
      return res.status(error.status || 400).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/agencies/:agencyId/google/remediation/validate", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour appeler la validation Google" });
      const agency = await loadAgency(prisma, req.params.agencyId);
      const result = await patchGoogleLocation(prisma, { agency, drift: parseDrift(req.body?.drift), validateOnly: true });
      return res.json({ ok: true, persisted: false, externalWrite: false, providerValidated: true, result });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, details: error.google || undefined });
    }
  });

  router.post("/api/presence/agencies/:agencyId/google/remediation/execute", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour modifier Google Business Profile" });
      const agency = await loadAgency(prisma, req.params.agencyId);
      const drift = parseDrift(req.body?.drift);
      const result = await patchGoogleLocation(prisma, { agency, drift, validateOnly: false });
      return res.json({ ok: true, externalWrite: true, verificationRequired: true, result });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, details: error.google || undefined });
    }
  });

  router.post("/api/presence/agencies/:agencyId/google/remediation/verify", async (req, res) => {
    try {
      const agency = await loadAgency(prisma, req.params.agencyId);
      const verification = await verifyGoogleRemediation(prisma, agency);
      return res.status(verification.verified ? 200 : 409).json({ ok: verification.verified, verification });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, details: error.google || undefined });
    }
  });

  return router;
}

module.exports = { remediationExecutionRoutes, parseDrift };
