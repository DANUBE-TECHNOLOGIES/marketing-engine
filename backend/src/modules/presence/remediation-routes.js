"use strict";

const express = require("express");
const { buildAnomalyQueue } = require("./anomaly-queue");
const { buildRemediationPlan } = require("./remediation-planner");

async function loadPresenceState(prisma) {
  const [agencies, directories, listings] = await Promise.all([
    prisma.agency.findMany({ orderBy: { id: "asc" } }),
    prisma.localDirectory.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
    prisma.directoryListing.findMany({ orderBy: [{ agencyId: "asc" }, { directoryId: "asc" }] })
  ]);
  return { agencies, directories, listings };
}

function remediationRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/network/anomalies", async (req, res) => {
    try {
      const state = await loadPresenceState(prisma);
      const queue = buildAnomalyQueue(state.agencies, state.directories, state.listings);
      const minScore = Number(req.query.minScore || 0);
      const limit = Math.max(1, Math.min(Number(req.query.limit || 200), 500));
      const items = queue.filter((item) => item.score >= minScore).slice(0, limit);
      return res.json({ ok: true, total: queue.length, returned: items.length, items });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get("/api/presence/network/remediation-plan", async (req, res) => {
    try {
      const state = await loadPresenceState(prisma);
      const queue = buildAnomalyQueue(state.agencies, state.directories, state.listings);
      const plan = buildRemediationPlan(queue, { limit: req.query.limit });
      return res.json({ ok: true, persisted: false, plan });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post("/api/presence/network/remediation-actions", async (req, res) => {
    try {
      if (req.body?.confirm !== true) {
        return res.status(409).json({ ok: false, error: "confirm=true requis pour créer des actions de remédiation" });
      }
      const state = await loadPresenceState(prisma);
      const queue = buildAnomalyQueue(state.agencies, state.directories, state.listings);
      const plan = buildRemediationPlan(queue, { limit: req.body?.limit });
      let created = 0;
      let existing = 0;
      const results = [];

      for (const item of plan.items) {
        const title = `Présence locale — ${item.directoryName}`;
        const already = await prisma.networkAction.findFirst({
          where: {
            agencyId: item.agencyId,
            lever: "citations",
            title,
            status: { in: ["todo", "in_progress"] }
          }
        });
        if (already) {
          existing += 1;
          results.push({ agencyId: item.agencyId, providerKey: item.providerKey, status: "existing", actionId: already.id });
          continue;
        }
        const action = await prisma.networkAction.create({
          data: {
            agencyId: item.agencyId,
            lever: "citations",
            title,
            description: `${item.instruction} Priorité Presence: ${item.score}.`,
            status: "todo",
            deadline: new Date(Date.now() + 14 * 86400000)
          }
        });
        created += 1;
        results.push({ agencyId: item.agencyId, providerKey: item.providerKey, status: "created", actionId: action.id });
      }

      return res.json({ ok: true, created, existing, totalPlanned: plan.planned, results });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { remediationRoutes, loadPresenceState };
