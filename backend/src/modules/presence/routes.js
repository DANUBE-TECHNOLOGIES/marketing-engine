"use strict";

const express = require("express");
const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { listPresenceProviders, getPresenceProvider } = require("./provider-registry");
const { enrichDirectoryWithProvider } = require("./directory-bridge");
const { projectGooglePresence } = require("./google-listing-adapter");
const { syncGoogleDirectoryListing } = require("./google-directory-sync");
const { auditDirectorySchema } = require("./directory-schema-audit");
const { getProviderReadiness } = require("./provider-readiness");
const { buildNetworkCoverage } = require("./network-coverage");
const { auditProviderCatalog } = require("./provider-catalog-audit");
const { buildCatalogReconciliation, applyCatalogReconciliation } = require("./provider-catalog-reconcile");

function routes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/health/schema", async (req, res) => {
    try { const schema = await auditDirectorySchema(prisma); return res.status(schema.ready ? 200 : 503).json({ ok: schema.ready, schema }); }
    catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/health/provider-catalog", async (req, res) => {
    try { const directories = await prisma.localDirectory.findMany({ orderBy: { id: "asc" } }); const catalog = auditProviderCatalog(directories); return res.status(catalog.ready ? 200 : 503).json({ ok: catalog.ready, catalog }); }
    catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/provider-catalog/reconcile/preview", async (req, res) => {
    try { const directories = await prisma.localDirectory.findMany({ orderBy: { id: "asc" } }); return res.json({ ok: true, persisted: false, plan: buildCatalogReconciliation(directories) }); }
    catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.post("/api/presence/provider-catalog/reconcile/apply", async (req, res) => {
    try {
      if (req.body?.confirm !== true) return res.status(409).json({ ok: false, error: "confirm=true requis pour réconcilier le catalogue Presence" });
      const directories = await prisma.localDirectory.findMany({ orderBy: { id: "asc" } });
      const plan = buildCatalogReconciliation(directories);
      const result = await applyCatalogReconciliation(prisma, plan, { alignMetadata: req.body?.alignMetadata === true });
      const refreshed = await prisma.localDirectory.findMany({ orderBy: { id: "asc" } });
      const catalog = auditProviderCatalog(refreshed);
      return res.json({ ok: catalog.ready, externalWrite: false, result, catalog });
    } catch (error) { return res.status(error.status || 500).json({ ok: false, error: error.message, schema: error.schema }); }
  });

  router.get("/api/presence/providers", async (req, res) => {
    try {
      const directories = await prisma.localDirectory.findMany({ orderBy: [{ priority: "desc" }, { name: "asc" }] });
      const directoryByProvider = new Map(directories.map(enrichDirectoryWithProvider).filter((directory) => directory.providerKey).map((directory) => [directory.providerKey, directory]));
      return res.json({ providers: listPresenceProviders().map((provider) => { const directory = directoryByProvider.get(provider.key); return { ...provider, readiness: getProviderReadiness(provider.key), legacyDirectory: directory ? { id: directory.id, name: directory.name, active: directory.active, priority: directory.priority, impactScore: directory.impactScore, difficulty: directory.difficulty } : null }; }) });
    } catch (error) { return res.status(500).json({ error: error.message }); }
  });

  router.get("/api/presence/providers/:providerKey/readiness", (req, res) => {
    const provider = getPresenceProvider(req.params.providerKey); if (!provider) return res.status(404).json({ error: "Provider Presence inconnu" }); return res.json({ provider, readiness: getProviderReadiness(provider.key) });
  });

  router.get("/api/presence/network/coverage", async (req, res) => {
    try { const [agencies, directories, listings] = await Promise.all([prisma.agency.findMany({ orderBy: { id: "asc" } }), prisma.localDirectory.findMany({ orderBy: { id: "asc" } }), prisma.directoryListing.findMany({ orderBy: [{ agencyId: "asc" }, { directoryId: "asc" }] })]); return res.json({ ok: true, ...buildNetworkCoverage(agencies, directories, listings) }); }
    catch (error) { return res.status(500).json({ ok: false, error: error.message }); }
  });

  router.get("/api/presence/agencies/:agencyId", async (req, res) => {
    try { const agencyId = Number(req.params.agencyId); if (!Number.isInteger(agencyId) || agencyId <= 0) return res.status(400).json({ error: "agencyId invalide" }); const agency = await prisma.agency.findUnique({ where: { id: agencyId } }); if (!agency) return res.status(404).json({ error: "Agence introuvable" }); const listings = await prisma.directoryListing.findMany({ where: { agencyId }, include: { directory: true }, orderBy: { directoryId: "asc" } }); return res.json({ agencyId, canonical: buildCanonicalAgencyIdentity(agency), listings: listings.map((listing) => ({ id: listing.id, status: listing.status, listingUrl: listing.listingUrl, lastCheckedAt: listing.lastCheckedAt, notes: listing.notes, directory: enrichDirectoryWithProvider(listing.directory) })) }); }
    catch (error) { return res.status(500).json({ error: error.message }); }
  });

  router.get("/api/presence/agencies/:agencyId/google", async (req, res) => {
    try { const agencyId = Number(req.params.agencyId); const agency = await prisma.agency.findUnique({ where: { id: agencyId } }); if (!agency) return res.status(404).json({ error: "Agence introuvable" }); const presence = await projectGooglePresence(prisma, agency); return res.json({ agencyId, provider: "google_business_profile", presence }); }
    catch (error) { return res.status(error.status || 500).json({ error: error.message, provider: "google_business_profile", details: error.google || undefined }); }
  });

  router.post("/api/presence/google/sync", async (req, res) => {
    try {
      const schema = await auditDirectorySchema(prisma); if (!schema.ready) return res.status(503).json({ ok: false, error: "Schéma directories incomplet pour Presence", schema });
      const directory = await prisma.localDirectory.findUnique({ where: { name: "Google Business Profile" } }); if (!directory) return res.status(409).json({ error: "Annuaire Google Business Profile non initialisé" });
      const agencies = await prisma.agency.findMany({ orderBy: { id: "asc" } }); const results = [];
      for (const agency of agencies) { let listing = await prisma.directoryListing.findUnique({ where: { agencyId_directoryId: { agencyId: agency.id, directoryId: directory.id } } }); if (!listing) listing = await prisma.directoryListing.create({ data: { agencyId: agency.id, directoryId: directory.id, status: "missing" } }); try { const updated = await syncGoogleDirectoryListing(prisma, agency, listing); results.push({ agencyId: agency.id, agencyName: agency.name, status: updated.status, listingUrl: updated.listingUrl, notes: updated.notes, ok: true }); } catch (error) { results.push({ agencyId: agency.id, agencyName: agency.name, ok: false, status: "error", error: error.message, googleStatus: error.status || null }); } }
      const summary = results.reduce((acc, item) => { acc.total += 1; if (item.ok) acc.synced += 1; else acc.errors += 1; acc[item.status] = (acc[item.status] || 0) + 1; return acc; }, { total: 0, synced: 0, errors: 0 });
      return res.json({ ok: summary.errors === 0, summary, results });
    } catch (error) { return res.status(500).json({ error: error.message }); }
  });

  return router;
}

module.exports = { routes };
