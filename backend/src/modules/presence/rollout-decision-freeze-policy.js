"use strict";

function evaluateRolloutDecisionFreezePolicy(decisionDrift, acknowledgementReason) {
  const critical = decisionDrift?.severity === "critical";
  const reason = String(acknowledgementReason || "").trim();
  const blockers = [];
  if (critical && reason.length < 12) blockers.push("critical_rollout_ack_reason_required");
  return Object.freeze({
    ready: blockers.length === 0,
    decision: blockers.length ? "no_go" : "go",
    acknowledgementRequired: critical,
    acknowledgementReason: reason || null,
    acknowledgementSeverity: decisionDrift?.severity || "none",
    blockers: Object.freeze(blockers)
  });
}

module.exports = { evaluateRolloutDecisionFreezePolicy };
