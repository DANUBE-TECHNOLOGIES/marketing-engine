"use strict";

const express = require("express");
const { buildAnomalyQueue } = require("./anomaly-queue");
const { buildRemediationPlan } = require("./remediation-planner");
const { recordCitationObservation } = require("./citation-recording");
const { appendOperationAudit, createOperationId } = require("./operation-audit");
const { setRuntimeListingState } = require("./runtime-listing-state");
const { assertManualProvider, manualActionTitle, buildManualRemediationPayload } = require("./manual-remediation");
const { directoryNameForProviderKey } = require("./directory-bridge");

async function loadAgency(prisma, rawAgencyId) {
  const agencyId = Number(rawAgencyId);
  if (!Number.isInteger(agencyId) || agencyId <= 0) { const error = new Error("agencyId invalide"); error.status = 400; throw error; }
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  if (!agency) { const error = new Error("Agence introuvable"); error.status = 404; throw error; }
  return agency;
}

async function loadDirectoryAndListing(prisma, agencyId, providerKey) {
  const directoryName = directoryNameForProviderKey(providerKey);
  const directory = directoryName ? await prisma.localDirectory.findUnique({ where: { name: directoryName } }) : null;
  if (!directory) { const error = new Error("Annuaire Presence non initialisé"); error.status = 409; throw error; }
  let listing = await prisma.directoryListing.findUnique({ where: { agencyId_directoryId: { agencyId, directoryId: directory.id } } });
  if (!listing) listing = await prisma.directoryListing.create({ data: { agencyId, directoryId: directory.id, status: "missing" } });
  return { directory, listing };
}

async function closeManualActions(prisma, agencyId, directoryName, comment) {
  const actions = await prisma.networkAction.findMany({
    where: { agencyId, lever: "citations", title: manualActionTitle(directoryName), status: { in: ["todo", "in_progress"] } }
  });
  for (const action of actions) {
    await prisma.networkAction.update({ where: { id: action.id }, data: { status: "done", comment } });
  }
  return actions.length;
}

function manualRemediationRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/manual-remediation/queue", async (req, res) => {
    try {
      const [agencies, directories, listings] = await Promise.all([
        prisma.agency.findMany({ orderBy: { id: "asc" } }),
        prisma.localDirectory.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
        prisma.directoryListing.findMany({ orderBy: [{ agencyId: "asc" }, { directoryId: "asc" }] })
      ]);
      const plan = buildRemediationPlan(buildAnomalyQueue(agencies, directories, listings), { limit: req.query.limit });
      const items = plan.items.filter((item) => item.remediationKind === "manual" || item.remediationKind === "provider_blocked");
      return res.json({ ok: true, total: items.length, items });
    } catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/agencies/:agencyId/providers/:providerKey/manual-remediation/start", async (req, res) => {
    const operationId = createOperationId("manual_remediation");
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour démarrer une remédiation manuelle" });
      const agency = await loadAgency(prisma, req.params.agencyId);
      const { directoryName } = assertManualProvider(req.params.providerKey);
      const { listing } = await loadDirectoryAndListing(prisma, agency.id, req.params.providerKey);
      const drift = Array.isArray(req.body?.drift) ? req.body.drift.filter(Boolean) : [];
      const payload = buildManualRemediationPayload({ providerKey: req.params.providerKey, listingId: listing.id, drift, listingUrl: listing.listingUrl, note: req.body?.note });
      let action = await prisma.networkAction.findFirst({ where: { agencyId: agency.id, lever: "citations", title: manualActionTitle(directoryName), status: { in: ["todo", "in_progress"] } } });
      if (!action) {
        action = await prisma.networkAction.create({ data: { agencyId: agency.id, lever: "citations", title: manualActionTitle(directoryName), description: `Correction manuelle Presence requise. Dérive: ${drift.join(", ") || "citation absente/non validée"}.`, status: "in_progress", deadline: new Date(Date.now() + 14 * 86400000) } });
      } else if (action.status === "todo") {
        action = await prisma.networkAction.update({ where: { id: action.id }, data: { status: "in_progress" } });
      }
      await setRuntimeListingState(prisma, listing.id, { automationStatus: "manual_in_progress", submissionPayload: { operationId, ...payload } });
      await appendOperationAudit(prisma, { operationId, providerKey: req.params.providerKey, agencyId: agency.id, listingId: listing.id, scope: "agency", eventType: "manual_remediation_started", status: "in_progress", payload: { actionId: action.id, ...payload } });
      return res.json({ ok: true, operationId, externalWrite: false, action: { id: action.id, status: action.status }, listingId: listing.id, payload });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, operationId, error: error.message }); }
  });

  router.post("/api/presence/agencies/:agencyId/providers/:providerKey/manual-remediation/verify", async (req, res) => {
    const operationId = req.body?.operationId || createOperationId("manual_verify");
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour enregistrer la vérification manuelle" });
      const agency = await loadAgency(prisma, req.params.agencyId);
      const { directoryName } = assertManualProvider(req.params.providerKey);
      const { listing } = await loadDirectoryAndListing(prisma, agency.id, req.params.providerKey);
      const observed = req.body?.observed || {};
      const recorded = await recordCitationObservation(prisma, { agency, providerKey: req.params.providerKey, observed, listingUrl: req.body?.listingUrl || listing.listingUrl || null });
      const verified = Boolean(recorded.result?.match);
      await setRuntimeListingState(prisma, recorded.listing.id, { automationStatus: verified ? "validated" : "manual_verification_pending" });
      const closedActions = verified ? await closeManualActions(prisma, agency.id, directoryName, "Citation vérifiée conforme par Presence après correction manuelle.") : 0;
      await appendOperationAudit(prisma, { operationId, providerKey: req.params.providerKey, agencyId: agency.id, listingId: recorded.listing.id, scope: "agency", eventType: "manual_verification", status: verified ? "verified" : "verification_pending", payload: { evidence: req.body?.evidence || null, listingUrl: req.body?.listingUrl || null }, result: recorded.result });
      return res.status(verified ? 200 : 409).json({ ok: verified, operationId, verified, closedActions, result: recorded.result, listing: { id: recorded.listing.id, status: recorded.listing.status, listingUrl: recorded.listing.listingUrl, lastCheckedAt: recorded.listing.lastCheckedAt } });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, operationId, error: error.message }); }
  });

  return router;
}

module.exports = { manualRemediationRoutes, loadDirectoryAndListing, closeManualActions };
