"use strict";

const { buildRolloutDecisionSnapshot, listRolloutDecisionSnapshots } = require("./network-rollout-decision-snapshot");
const { compareRolloutDecision } = require("./network-rollout-decision-drift");

async function evaluateRolloutDecisionAcknowledgement(prisma, rolloutGate) {
  const history = await listRolloutDecisionSnapshots(prisma, 1);
  const previous = history[0] || null;
  const current = buildRolloutDecisionSnapshot(rolloutGate, rolloutGate?.recoveryTrust || null);
  const drift = compareRolloutDecision(current, previous);
  const blockers = [];
  if (previous && drift.severity === "critical") blockers.push("critical_rollout_decision_drift_unacknowledged");
  const ready = blockers.length === 0;
  return Object.freeze({
    ready,
    decision: ready ? "go" : "no_go",
    required: Boolean(previous),
    blockers: Object.freeze(blockers),
    currentSnapshotId: current.snapshotId,
    previousSnapshotId: previous?.snapshotId || null,
    drift
  });
}

module.exports = { evaluateRolloutDecisionAcknowledgement };
