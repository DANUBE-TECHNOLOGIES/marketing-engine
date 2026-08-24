"use strict";

const express = require("express");
const { buildGoogleRemediationPatch, patchGoogleLocation, verifyGoogleRemediation } = require("./google-remediation");
const { syncGoogleDirectoryListing } = require("./google-directory-sync");
const { setRuntimeListingState } = require("./runtime-listing-state");
const { assertGoogleManagedWriteReady } = require("./operational-readiness");

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

async function loadGoogleListing(prisma, agencyId) {
  const directory = await prisma.localDirectory.findUnique({ where: { name: "Google Business Profile" } });
  if (!directory) {
    const error = new Error("Annuaire Google Business Profile non initialisé");
    error.status = 409;
    throw error;
  }
  let listing = await prisma.directoryListing.findUnique({ where: { agencyId_directoryId: { agencyId, directoryId: directory.id } } });
  if (!listing) listing = await prisma.directoryListing.create({ data: { agencyId, directoryId: directory.id, status: "missing" } });
  return listing;
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
      await assertGoogleManagedWriteReady(prisma);
      const agency = await loadAgency(prisma, req.params.agencyId);
      const result = await patchGoogleLocation(prisma, { agency, drift: parseDrift(req.body?.drift), validateOnly: true });
      return res.json({ ok: true, persisted: false, externalWrite: false, providerValidated: true, result });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, readiness: error.readiness, details: error.google || undefined });
    }
  });

  router.post("/api/presence/agencies/:agencyId/google/remediation/execute", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour modifier Google Business Profile" });
      await assertGoogleManagedWriteReady(prisma);
      const agency = await loadAgency(prisma, req.params.agencyId);
      const drift = parseDrift(req.body?.drift);
      const preview = buildGoogleRemediationPatch(agency, drift);
      if (preview.risk.requiresSensitiveConfirmation && req.body?.confirmSensitive !== true) {
        return res.status(409).json({
          ok: false,
          error: "confirmSensitive=true requis pour modifier le nom ou l’adresse Google",
          risk: preview.risk,
          patch: preview
        });
      }

      const validation = await patchGoogleLocation(prisma, { agency, drift, validateOnly: true });
      const result = await patchGoogleLocation(prisma, { agency, drift, validateOnly: false });
      const listing = await loadGoogleListing(prisma, agency.id);
      const tracked = await prisma.directoryListing.update({
        where: { id: listing.id },
        data: { status: "pending", notes: `Correction Google soumise via Presence pour: ${drift.join(", ")}. Validation Google réussie; vérification distante requise.` }
      });
      const runtime = await setRuntimeListingState(prisma, tracked.id, {
        automationStatus: "submitted",
        submittedAt: new Date(),
        submissionPayload: { provider: "google_business_profile", drift, risk: preview.risk }
      });
      return res.json({
        ok: true,
        externalWrite: true,
        providerValidated: true,
        validation,
        verificationRequired: true,
        result,
        listing: { id: tracked.id, status: tracked.status, automationStatus: runtime.automationStatus, submittedAt: runtime.submittedAt }
      });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, readiness: error.readiness, details: error.google || undefined });
    }
  });

  router.post("/api/presence/agencies/:agencyId/google/remediation/verify", async (req, res) => {
    try {
      await assertGoogleManagedWriteReady(prisma);
      const agency = await loadAgency(prisma, req.params.agencyId);
      const listing = await loadGoogleListing(prisma, agency.id);
      const verification = await verifyGoogleRemediation(prisma, agency);
      const synced = await syncGoogleDirectoryListing(prisma, agency, listing);
      await setRuntimeListingState(prisma, synced.id, {
        automationStatus: verification.verified ? "validated" : "verification_pending"
      });
      return res.status(verification.verified ? 200 : 409).json({
        ok: verification.verified,
        verification,
        listing: { id: synced.id, status: synced.status, lastCheckedAt: synced.lastCheckedAt }
      });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, readiness: error.readiness, details: error.google || undefined });
    }
  });

  return router;
}

module.exports = { remediationExecutionRoutes, parseDrift, loadGoogleListing };
