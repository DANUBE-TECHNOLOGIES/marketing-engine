"use strict";

const express = require("express");
const { buildNetworkDiscoveryPlan } = require("./network-discovery");
const { submitDiscoveryTask } = require("./citation-discovery-dataforseo");
const { assertDiscoveryReady } = require("./operational-readiness");

function parseProviderKeys(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

async function loadAgencies(prisma, body = {}) {
  const ids = Array.isArray(body.agencyIds)
    ? body.agencyIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
    : [];
  return prisma.agency.findMany({
    ...(ids.length ? { where: { id: { in: ids } } } : {}),
    orderBy: { id: "asc" }
  });
}

function networkDiscoveryRoutes({ prisma }) {
  const router = express.Router();

  router.post("/api/presence/network/discovery/preview", async (req, res) => {
    try {
      const agencies = await loadAgencies(prisma, req.body || {});
      const plan = buildNetworkDiscoveryPlan(agencies, {
        maxTasks: req.body?.maxTasks,
        providerKeys: parseProviderKeys(req.body?.providerKeys)
      });
      return res.json({ ok: true, persisted: false, submitted: false, plan });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/network/discovery/start", async (req, res) => {
    try {
      if (req.body?.confirm !== true) {
        return res.status(409).json({ ok: false, error: "confirm=true requis pour consommer le budget de découverte" });
      }
      await assertDiscoveryReady(prisma);
      const agencies = await loadAgencies(prisma, req.body || {});
      const plan = buildNetworkDiscoveryPlan(agencies, {
        maxTasks: req.body?.maxTasks,
        providerKeys: parseProviderKeys(req.body?.providerKeys)
      });
      const jobs = [];
      for (const job of plan.jobs) {
        const tasks = [];
        for (const query of job.queries) {
          const submitted = await submitDiscoveryTask(query);
          tasks.push({ query, taskId: submitted.taskId });
        }
        jobs.push({ agencyId: job.agencyId, agencyName: job.agencyName, providerKey: job.providerKey, tasks });
      }
      return res.status(202).json({
        ok: true,
        persisted: false,
        submitted: true,
        budget: plan.budget,
        jobCount: jobs.length,
        jobs
      });
    } catch (error) {
      return res.status(error.status || 500).json({ ok: false, error: error.message, readiness: error.readiness, details: error.details || undefined });
    }
  });

  return router;
}

module.exports = { networkDiscoveryRoutes, parseProviderKeys };
