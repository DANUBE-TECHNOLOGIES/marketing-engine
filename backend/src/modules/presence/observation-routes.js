"use strict";

const express = require("express");
const { getPresenceProvider } = require("./provider-registry");
const { evaluateCitationObservation } = require("./citation-observation");
const { recordCitationObservation } = require("./citation-recording");

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

function loadProvider(providerKey) {
  const provider = getPresenceProvider(providerKey);
  if (!provider) {
    const error = new Error("Provider Presence inconnu");
    error.status = 404;
    throw error;
  }
  return provider;
}

function observationRoutes({ prisma }) {
  const router = express.Router();

  router.post(
    "/api/presence/agencies/:agencyId/providers/:providerKey/compare",
    async (req, res) => {
      try {
        const agency = await loadAgency(prisma, req.params.agencyId);
        const provider = loadProvider(req.params.providerKey);
        const observed = req.body?.observed || req.body || {};
        const result = evaluateCitationObservation({
          agency,
          providerKey: provider.key,
          observed
        });
        return res.json({ ok: true, persisted: false, result });
      } catch (error) {
        return res.status(error.status || 400).json({ ok: false, error: error.message });
      }
    }
  );

  router.post(
    "/api/presence/agencies/:agencyId/providers/:providerKey/observe",
    async (req, res) => {
      try {
        if (req.body?.confirm !== true) {
          return res.status(409).json({
            ok: false,
            error: "confirm=true requis pour enregistrer une observation de citation"
          });
        }

        const agency = await loadAgency(prisma, req.params.agencyId);
        const provider = loadProvider(req.params.providerKey);
        const observed = req.body?.observed || {};
        const recorded = await recordCitationObservation(prisma, {
          agency,
          providerKey: provider.key,
          observed,
          listingUrl: req.body?.listingUrl || null
        });

        return res.json({
          ok: true,
          persisted: true,
          result: recorded.result,
          listing: {
            id: recorded.listing.id,
            status: recorded.listing.status,
            listingUrl: recorded.listing.listingUrl,
            notes: recorded.listing.notes,
            lastCheckedAt: recorded.listing.lastCheckedAt
          }
        });
      } catch (error) {
        return res.status(error.status || 400).json({ ok: false, error: error.message });
      }
    }
  );

  return router;
}

module.exports = { observationRoutes };
