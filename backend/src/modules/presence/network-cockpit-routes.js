"use strict";

const express = require("express");
const { listPendingPropagation } = require("./propagation-watch");
const { buildNetworkCockpit } = require("./network-cockpit");
const { buildRecoveryTrustOverview } = require("./recovery-trust-overview");
const { evaluateNetworkRolloutGate } = require("./network-rollout-gate");

async function loadCockpitState(prisma) {
  const [agencies, directories, listings, pendingPropagation, actions] = await Promise.all([
    prisma.agency.findMany({ orderBy: { id: "asc" } }),
    prisma.localDirectory.findMany({ orderBy: { id: "asc" } }),
    prisma.directoryListing.findMany({ orderBy: [{ agencyId: "asc" }, { directoryId: "asc" }] }),
    listPendingPropagation(prisma, { limit: 500 }),
    prisma.networkAction.findMany({
      where: { lever: { startsWith: "presence_" }, status: { in: ["todo", "in_progress"] } },
      include: { agency: true },
      orderBy: { createdAt: "asc" }
    })
  ]);
  return { agencies, directories, listings, pendingPropagation, actions };
}

function networkCockpitRoutes({ prisma }) {
  const router = express.Router();

  router.get("/api/presence/network/cockpit", async (req, res) => {
    try {
      const state = await loadCockpitState(prisma);
      const [recoveryTrust, rolloutGate] = await Promise.all([
        buildRecoveryTrustOverview(prisma, 200),
        evaluateNetworkRolloutGate(prisma, state.agencies.length)
      ]);
      const cockpit = buildNetworkCockpit(state);
      const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 500));
      return res.json({
        ok: true,
        generatedAt: new Date().toISOString(),
        ...cockpit,
        recoveryTrust,
        rolloutGate,
        interventionQueue: cockpit.interventionQueue.slice(0, limit)
      });
    } catch (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  return router;
}

module.exports = { networkCockpitRoutes, loadCockpitState };
