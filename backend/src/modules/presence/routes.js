"use strict";

const express = require("express");
const { projectGooglePresence } = require("./google-listing-adapter");
const { syncGoogleDirectoryListing } = require("./google-directory-sync");

function routes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/agencies/:agencyId/google", async (req, res) => {
    try {
      const agencyId = Number(req.params.agencyId);
      const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
      if (!agency) return res.status(404).json({ error: "Agence introuvable" });
      const presence = await projectGooglePresence(prisma, agency);
      return res.json({ agencyId, provider: "google_business_profile", presence });
    } catch (error) {
      return res.status(error.status || 500).json({
        error: error.message,
        provider: "google_business_profile",
        details: error.google || undefined
      });
    }
  });

  router.post("/api/presence/google/sync", async (req, res) => {
    try {
      const directory = await prisma.localDirectory.findUnique({
        where: { name: "Google Business Profile" }
      });
      if (!directory) {
        return res.status(409).json({ error: "Annuaire Google Business Profile non initialisé" });
      }

      const agencies = await prisma.agency.findMany({
        orderBy: { id: "asc" }
      });
      const results = [];

      for (const agency of agencies) {
        let listing = await prisma.directoryListing.findUnique({
          where: {
            agencyId_directoryId: {
              agencyId: agency.id,
              directoryId: directory.id
            }
          }
        });
        if (!listing) {
          listing = await prisma.directoryListing.create({
            data: { agencyId: agency.id, directoryId: directory.id, status: "missing" }
          });
        }

        try {
          const updated = await syncGoogleDirectoryListing(prisma, agency, listing);
          results.push({
            agencyId: agency.id,
            agencyName: agency.name,
            status: updated.status,
            listingUrl: updated.listingUrl,
            notes: updated.notes,
            ok: true
          });
        } catch (error) {
          results.push({
            agencyId: agency.id,
            agencyName: agency.name,
            ok: false,
            status: "error",
            error: error.message,
            googleStatus: error.status || null
          });
        }
      }

      const summary = results.reduce((acc, item) => {
        acc.total += 1;
        if (item.ok) acc.synced += 1;
        else acc.errors += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, { total: 0, synced: 0, errors: 0 });

      return res.json({ ok: summary.errors === 0, summary, results });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { routes };