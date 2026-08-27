"use strict";

const { compareRolloutDecision } = require("./network-rollout-decision-drift");

function replacementChildren(acknowledgements = []) {
  const byPrevious = new Map();
  for (const ack of acknowledgements) {
    const previous = ack?.previousAcknowledgementSnapshotId || null;
    if (!previous) continue;
    if (!byPrevious.has(previous)) byPrevious.set(previous, []);
    byPrevious.get(previous).push(ack.snapshotId);
  }
  return byPrevious;
}

function evaluateAcknowledgementLifecycle(currentSnapshot, acknowledgements = []) {
  const children = replacementChildren(acknowledgements);
  return Object.freeze(acknowledgements.map((ack) => {
    const acknowledgedSnapshot = {
      snapshotId: ack.snapshotId,
      decision: ack.decision,
      ready: ack.ready === true,
      nextStagePercent: ack.nextStagePercent ?? null,
      maxAgencies: ack.maxAgencies ?? null,
      blockers: ack.blockers || [],
      stages: ack.stages || [],
      recoveryTrust: ack.recoveryTrust || null
    };
    const drift = compareRolloutDecision(currentSnapshot, acknowledgedSnapshot);
    const status = drift.severity === "critical" ? "obsolete" : drift.changed ? "superseded" : "active";
    const successors = Object.freeze([...(children.get(ack.snapshotId) || [])]);
    return Object.freeze({ ...ack, lifecycle: Object.freeze({ status, current: status === "active", obsolete: status === "obsolete", replacedByAcknowledgementSnapshotId: successors[0] || null, replacementSuccessors: successors, drift }) });
  }));
}

module.exports = { evaluateAcknowledgementLifecycle, replacementChildren };
