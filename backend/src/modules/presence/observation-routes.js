"use strict";

const express = require("express");
const { getPresenceProvider } = require("./provider-registry");
const { evaluateCitationObservation } = require("./citation-observation");

function observationRoutes({ prisma }) {
  const router = express.Router();

  router.post(
    "/api/presence/agencies/:agencyId/providers/:providerKey/compare",
    async (req, res) => {
      try {
        const agencyId = Number(req.params.agencyId);
        if (!Number.isInteger(agencyId) || agencyId <= 0) {
          return res.status(400).json({ error: "agencyId invalide" });
        }

        const provider = getPresenceProvider(req.params.providerKey);
        if (!provider) {
          return res.status(404).json({ error: "Provider Presence inconnu" });
        }

        const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
        if (!agency) return res.status(404).json({ error: "Agence introuvable" });

        const observed = req.body?.observed || req.body || {};
        const result = evaluateCitationObservation({
          agency,
          providerKey: provider.key,
          observed
        });

        return res.json({ ok: true, result });
      } catch (error) {
        return res.status(400).json({ ok: false, error: error.message });
      }
    }
  );

  return router;
}

module.exports = { observationRoutes };
