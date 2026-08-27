"use strict";

const { buildRolloutDecisionSnapshot, listRolloutDecisionSnapshots } = require("./network-rollout-decision-snapshot");
const { compareRolloutDecision } = require("./network-rollout-decision-drift");

function criticalAcknowledgementEvidenceValid(latest, prior) {
  if (!latest || !prior) return true;
  const transition = compareRolloutDecision(latest, prior);
  if (transition.severity !== "critical") return true;
  const ack = latest.acknowledgement || {};
  const reason = String(ack.reason || "").trim();
  return ack.required === true && ack.severity === "critical" && reason.length >= 12 && ack.actor?.type === "operator" && Boolean(String(ack.actor?.id || "").trim()) && ack.previousSnapshotId === prior.snapshotId;
}

async function evaluateRolloutDecisionAcknowledgement(prisma, rolloutGate) {
  const history = await listRolloutDecisionSnapshots(prisma, 2);
  const latest = history[0] || null;
  const prior = history[1] || null;
  const current = buildRolloutDecisionSnapshot(rolloutGate, rolloutGate?.recoveryTrust || null);
  const drift = compareRolloutDecision(current, latest);
  const blockers = [];
  if (latest && drift.severity === "critical") blockers.push("critical_rollout_decision_drift_unacknowledged");
  if (latest && prior && !criticalAcknowledgementEvidenceValid(latest, prior)) blockers.push("critical_rollout_decision_acknowledgement_evidence_invalid");
  const ready = blockers.length === 0;
  return Object.freeze({ ready, decision: ready ? "go" : "no_go", required: Boolean(latest), blockers: Object.freeze([...new Set(blockers)]), currentSnapshotId: current.snapshotId, previousSnapshotId: latest?.snapshotId || null, acknowledgementEvidenceValid: latest && prior ? criticalAcknowledgementEvidenceValid(latest, prior) : true, drift });
}

module.exports = { evaluateRolloutDecisionAcknowledgement, criticalAcknowledgementEvidenceValid };
