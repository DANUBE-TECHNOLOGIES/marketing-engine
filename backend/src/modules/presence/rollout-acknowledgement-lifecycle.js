"use strict";

const { compareRolloutDecision } = require("./network-rollout-decision-drift");

function evaluateAcknowledgementLifecycle(currentSnapshot, acknowledgements = []) {
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
    return Object.freeze({ ...ack, lifecycle: Object.freeze({ status, current: status === "active", obsolete: status === "obsolete", drift }) });
  }));
}

module.exports = { evaluateAcknowledgementLifecycle };
