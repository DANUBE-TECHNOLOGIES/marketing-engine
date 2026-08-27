"use strict";

const { buildRolloutDecisionSnapshot, listRolloutDecisionSnapshots, listCriticalRolloutAcknowledgements } = require("./network-rollout-decision-snapshot");
const { compareRolloutDecision } = require("./network-rollout-decision-drift");
const { evaluateAcknowledgementLifecycle } = require("./rollout-acknowledgement-lifecycle");

function criticalAcknowledgementEvidenceValid(latest, prior) {
  if (!latest || !prior) return true;
  const transition = compareRolloutDecision(latest, prior);
  if (transition.severity !== "critical") return true;
  const ack = latest.acknowledgement || {};
  const reason = String(ack.reason || "").trim();
  return ack.required === true && ack.severity === "critical" && reason.length >= 12 && ack.actor?.type === "operator" && Boolean(String(ack.actor?.id || "").trim()) && ack.previousSnapshotId === prior.snapshotId;
}

function latestDistinctPair(history = []) {
  const latest = history[0] || null;
  if (!latest) return Object.freeze({ latest: null, prior: null });
  const prior = history.find((row, index) => index > 0 && row?.snapshotId && row.snapshotId !== latest.snapshotId) || null;
  return Object.freeze({ latest, prior });
}

function acknowledgementReplacementChainValid(acknowledgements = []) {
  const latest = acknowledgements[0] || null;
  if (!latest || Number(latest.chainVersion || 0) < 1) return true;
  const previous = acknowledgements[1] || null;
  if (!previous) return latest.previousAcknowledgementSnapshotId == null;
  return latest.previousAcknowledgementSnapshotId === previous.snapshotId;
}

async function evaluateRolloutDecisionAcknowledgement(prisma, rolloutGate) {
  const [history, acknowledgements] = await Promise.all([
    listRolloutDecisionSnapshots(prisma, 10),
    listCriticalRolloutAcknowledgements(prisma, 20)
  ]);
  const { latest, prior } = latestDistinctPair(history);
  const current = buildRolloutDecisionSnapshot(rolloutGate, rolloutGate?.recoveryTrust || null);
  const drift = compareRolloutDecision(current, latest);
  const acknowledgementLifecycle = evaluateAcknowledgementLifecycle(current, acknowledgements);
  const latestAcknowledgement = acknowledgementLifecycle[0] || null;
  const replacementChainValid = acknowledgementReplacementChainValid(acknowledgements);
  const blockers = [];
  if (latest && drift.severity === "critical") blockers.push("critical_rollout_decision_drift_unacknowledged");
  if (latest && prior && !criticalAcknowledgementEvidenceValid(latest, prior)) blockers.push("critical_rollout_decision_acknowledgement_evidence_invalid");
  if (!replacementChainValid) blockers.push("critical_rollout_acknowledgement_replacement_chain_invalid");
  if (latestAcknowledgement?.lifecycle?.status === "obsolete") blockers.push("obsolete_rollout_decision_acknowledgement");
  const ready = blockers.length === 0;
  return Object.freeze({
    ready,
    decision: ready ? "go" : "no_go",
    required: Boolean(latest),
    blockers: Object.freeze([...new Set(blockers)]),
    currentSnapshotId: current.snapshotId,
    previousSnapshotId: latest?.snapshotId || null,
    acknowledgementEvidenceValid: latest && prior ? criticalAcknowledgementEvidenceValid(latest, prior) : true,
    acknowledgementReplacementChainValid: replacementChainValid,
    latestAcknowledgement,
    acknowledgementLifecycle: Object.freeze(acknowledgementLifecycle),
    drift
  });
}

module.exports = { evaluateRolloutDecisionAcknowledgement, criticalAcknowledgementEvidenceValid, latestDistinctPair, acknowledgementReplacementChainValid };
