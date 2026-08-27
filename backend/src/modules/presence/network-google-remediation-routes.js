"use strict";

const express = require("express");
const { buildGoogleRemediationRunPlan } = require("./network-google-remediation");
const { patchGoogleLocation, verifyGoogleRemediation } = require("./google-remediation");
const { syncGoogleDirectoryListing } = require("./google-directory-sync");
const { setRuntimeListingState, listSubmittedGoogleRuntimeListings } = require("./runtime-listing-state");
const { assertGoogleManagedWriteReady } = require("./operational-readiness");

async function loadState(prisma) {
  const [agencies, directories, listings] = await Promise.all([
    prisma.agency.findMany({ orderBy: { id: "asc" } }),
    prisma.localDirectory.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
    prisma.directoryListing.findMany({ orderBy: [{ agencyId: "asc" }, { directoryId: "asc" }] })
  ]);
  return { agencies, directories, listings };
}

function agencyMap(agencies) {
  return new Map(agencies.map((agency) => [agency.id, agency]));
}

async function buildPlanWithRuntimeGuard(prisma, state, options = {}) {
  const googleDirectory = state.directories.find((directory) => directory.name === "Google Business Profile");
  const inFlight = googleDirectory ? await listSubmittedGoogleRuntimeListings(prisma, googleDirectory.id) : [];
  return buildGoogleRemediationRunPlan(state.agencies, state.directories, state.listings, {
    ...options,
    blockedListingIds: inFlight.map((listing) => listing.id)
  });
}

function networkGoogleRemediationRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/network/google/remediation/preview", async (req, res) => {
    try {
      const state = await loadState(prisma);
      const plan = await buildPlanWithRuntimeGuard(prisma, state, {
        limit: req.body?.limit,
        includeSensitive: req.body?.includeSensitive === true
      });
      return res.json({ ok: true, externalWrite: false, plan });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/network/google/remediation/execute", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour une remédiation Google réseau" });
      const includeSensitive = req.body?.includeSensitive === true;
      if (includeSensitive && req.body?.confirmSensitive !== true) {
        return res.status(409).json({ ok: false, error: "confirmSensitive=true requis pour inclure nom ou adresse" });
      }
      await assertGoogleManagedWriteReady(prisma);

      const state = await loadState(prisma);
      const plan = await buildPlanWithRuntimeGuard(prisma, state, { limit: req.body?.limit, includeSensitive });
      const agencies = agencyMap(state.agencies);
      const results = [];

      for (const item of plan.items) {
        const agency = agencies.get(item.agencyId);
        if (!agency) continue;
        try {
          await patchGoogleLocation(prisma, { agency, drift: item.drift, validateOnly: true });
          const write = await patchGoogleLocation(prisma, { agency, drift: item.drift, validateOnly: false });
          if (item.listingId) {
            await prisma.directoryListing.update({
              where: { id: item.listingId },
              data: { status: "pending", notes: `Correction Google réseau soumise via Presence pour: ${item.drift.join(", ")}. Vérification requise.` }
            });
            await setRuntimeListingState(prisma, item.listingId, {
              automationStatus: "submitted",
              submittedAt: new Date(),
              submissionPayload: { provider: "google_business_profile", drift: item.drift, risk: item.risk }
            });
          }
          results.push({ agencyId: item.agencyId, agencyName: item.agencyName, status: "submitted", drift: item.drift, risk: item.risk, write });
        } catch (error) {
          results.push({ agencyId: item.agencyId, agencyName: item.agencyName, status: "error", drift: item.drift, risk: item.risk, error: error.message, googleStatus: error.status || null });
        }
      }

      const summary = results.reduce((acc, item) => {
        acc.total += 1;
        if (item.status === "submitted") acc.submitted += 1;
        else acc.errors += 1;
        return acc;
      }, { total: 0, submitted: 0, errors: 0 });
      return res.json({ ok: summary.errors === 0, externalWrite: true, verificationRequired: true, plan, summary, results });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, readiness: error.readiness });
    }
  });

  router.post("/api/presence/network/google/remediation/verify", async (req, res) => {
    try {
      await assertGoogleManagedWriteReady(prisma);
      const state = await loadState(prisma);
      const googleDirectory = state.directories.find((directory) => directory.name === "Google Business Profile");
      if (!googleDirectory) return res.status(409).json({ ok: false, error: "Annuaire Google Business Profile non initialisé" });
      const pending = await listSubmittedGoogleRuntimeListings(prisma, googleDirectory.id);
      const agencies = agencyMap(state.agencies);
      const results = [];

      for (const listing of pending) {
        const agency = agencies.get(listing.agencyId);
        if (!agency) continue;
        try {
          const verification = await verifyGoogleRemediation(prisma, agency);
          const synced = await syncGoogleDirectoryListing(prisma, agency, listing);
          await setRuntimeListingState(prisma, synced.id, { automationStatus: verification.verified ? "validated" : "verification_pending" });
          results.push({ agencyId: agency.id, agencyName: agency.name, verified: verification.verified, status: synced.status, drift: verification.diff.drift });
        } catch (error) {
          results.push({ agencyId: agency.id, agencyName: agency.name, verified: false, status: "error", error: error.message, googleStatus: error.status || null });
        }
      }

      const verified = results.filter((item) => item.verified).length;
      return res.json({ ok: results.every((item) => item.verified), total: results.length, verified, pending: results.length - verified, results });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, readiness: error.readiness });
    }
  });

  return router;
}

module.exports = { networkGoogleRemediationRoutes, loadState, buildPlanWithRuntimeGuard };
