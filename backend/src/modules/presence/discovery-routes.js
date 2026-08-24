"use strict";

const express = require("express");
const { getPresenceProvider } = require("./provider-registry");
const { buildDiscoveryQueries, rankDiscoveryCandidates } = require("./citation-discovery");
const { submitDiscoveryTask, readDiscoveryTask } = require("./citation-discovery-dataforseo");
const { recordDiscoveredCitation } = require("./citation-discovery-recording");

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
  if (!provider.capabilities.includes("discover")) {
    const error = new Error(`Provider ${providerKey} does not support discovery`);
    error.status = 409;
    throw error;
  }
  return provider;
}

function discoveryRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/agencies/:agencyId/providers/:providerKey/discovery/preview", async (req, res) => {
    try {
      const agency = await loadAgency(prisma, req.params.agencyId);
      const provider = loadProvider(req.params.providerKey);
      return res.json({
        ok: true,
        persisted: false,
        providerKey: provider.key,
        queries: buildDiscoveryQueries(agency, provider.key)
      });
    } catch (error) {
      return res.status(error.status || 400).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/agencies/:agencyId/providers/:providerKey/discovery/start", async (req, res) => {
    try {
      const agency = await loadAgency(prisma, req.params.agencyId);
      const provider = loadProvider(req.params.providerKey);
      const queries = buildDiscoveryQueries(agency, provider.key);
      if (!queries.length) {
        return res.status(409).json({ ok: false, error: "Aucun domaine de découverte configuré pour ce provider" });
      }
      const tasks = [];
      for (const query of queries) {
        const submitted = await submitDiscoveryTask(query);
        tasks.push({ query, taskId: submitted.taskId });
      }
      return res.status(202).json({ ok: true, providerKey: provider.key, tasks });
    } catch (error) {
      return res.status(error.status || 500).json({
        ok: false,
        error: error.message,
        details: error.details || undefined
      });
    }
  });

  router.post("/api/presence/agencies/:agencyId/providers/:providerKey/discovery/result", async (req, res) => {
    try {
      const agency = await loadAgency(prisma, req.params.agencyId);
      const provider = loadProvider(req.params.providerKey);
      const taskIds = Array.isArray(req.body?.taskIds) ? req.body.taskIds.filter(Boolean) : [];
      if (!taskIds.length) return res.status(400).json({ ok: false, error: "taskIds requis" });

      const rawItems = [];
      const tasks = [];
      for (const taskId of taskIds) {
        const result = await readDiscoveryTask(taskId);
        tasks.push({
          taskId,
          ready: result.ready,
          statusCode: result.statusCode,
          statusMessage: result.statusMessage
        });
        rawItems.push(...result.items);
      }
      const candidates = rankDiscoveryCandidates(agency, provider.key, rawItems);
      let persisted = null;

      if (req.body?.confirm === true && candidates.length) {
        const candidate = candidates[0];
        const minimumScore = Number(req.body?.minimumScore ?? 80);
        if (candidate.score < minimumScore) {
          return res.status(409).json({
            ok: false,
            error: `Meilleur candidat sous le seuil de confiance (${candidate.score} < ${minimumScore})`,
            tasks,
            candidates
          });
        }
        persisted = await recordDiscoveredCitation(prisma, {
          agency,
          providerKey: provider.key,
          candidate
        });
      }

      return res.json({
        ok: true,
        providerKey: provider.key,
        tasks,
        candidates,
        persisted: persisted
          ? {
              id: persisted.id,
              status: persisted.status,
              listingUrl: persisted.listingUrl,
              notes: persisted.notes,
              lastCheckedAt: persisted.lastCheckedAt
            }
          : false
      });
    } catch (error) {
      return res.status(error.status || 500).json({
        ok: false,
        error: error.message,
        details: error.details || undefined
      });
    }
  });

  return router;
}

module.exports = { discoveryRoutes };
