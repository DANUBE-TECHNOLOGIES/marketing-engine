"use strict";

const { buildRolloutDecisionSnapshot, listRolloutDecisionSnapshots, listCriticalRolloutAcknowledgements } = require("./network-rollout-decision-snapshot");
const { compareRolloutDecision } = require("./network-rollout-decision-drift");
const { evaluateAcknowledgementLifecycle } = require("./rollout-acknowledgement-lifecycle");
const { auditAcknowledgementChain } = require("./rollout-acknowledgement-chain-audit");
const { evaluateAcknowledgementSealingMaturity } = require("./rollout-acknowledgement-sealing-maturity");
const { evaluateAcknowledgementSealingPolicy } = require("./rollout-acknowledgement-sealing-policy");

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

function acknowledgementChainForks(acknowledgements = []) { return auditAcknowledgementChain(acknowledgements).forks; }

async function evaluateRolloutDecisionAcknowledgement(prisma, rolloutGate) {
  const [history, acknowledgements] = await Promise.all([listRolloutDecisionSnapshots(prisma, 10), listCriticalRolloutAcknowledgements(prisma, 50)]);
  const { latest, prior } = latestDistinctPair(history);
  const current = buildRolloutDecisionSnapshot(rolloutGate, rolloutGate?.recoveryTrust || null);
  const drift = compareRolloutDecision(current, latest);
  const acknowledgementLifecycle = evaluateAcknowledgementLifecycle(current, acknowledgements);
  const latestAcknowledgement = acknowledgementLifecycle[0] || null;
  const replacementChainValid = acknowledgementReplacementChainValid(acknowledgements);
  const chainAudit = auditAcknowledgementChain(acknowledgements);
  const sealingMaturity = evaluateAcknowledgementSealingMaturity(chainAudit);
  const sealingPolicy = evaluateAcknowledgementSealingPolicy(sealingMaturity);
  const blockers = [];
  if (latest && drift.severity === "critical") blockers.push("critical_rollout_decision_drift_unacknowledged");
  if (latest && prior && !criticalAcknowledgementEvidenceValid(latest, prior)) blockers.push("critical_rollout_decision_acknowledgement_evidence_invalid");
  if (!replacementChainValid) blockers.push("critical_rollout_acknowledgement_replacement_chain_invalid");
  if (chainAudit.forks.length) blockers.push("critical_rollout_acknowledgement_chain_fork_detected");
  if (chainAudit.missingParents.length) blockers.push("critical_rollout_acknowledgement_chain_parent_missing");
  if (chainAudit.cycles.length) blockers.push("critical_rollout_acknowledgement_chain_cycle_detected");
  if (chainAudit.versioned && chainAudit.roots.length !== 1) blockers.push("critical_rollout_acknowledgement_chain_root_invalid");
  if (chainAudit.rootMismatches?.length) blockers.push("critical_rollout_acknowledgement_chain_root_mismatch");
  if (chainAudit.versioned && !chainAudit.ready && !chainAudit.forks.length && !chainAudit.missingParents.length && !chainAudit.cycles.length && chainAudit.roots.length === 1 && !chainAudit.rootMismatches?.length) blockers.push("critical_rollout_acknowledgement_chain_disconnected");
  if (latestAcknowledgement?.lifecycle?.status === "obsolete") blockers.push("obsolete_rollout_decision_acknowledgement");
  for (const blocker of sealingPolicy.blockers) blockers.push(blocker);
  const ready = blockers.length === 0;
  return Object.freeze({ready,decision:ready?"go":"no_go",required:Boolean(latest),blockers:Object.freeze([...new Set(blockers)]),currentSnapshotId:current.snapshotId,previousSnapshotId:latest?.snapshotId||null,acknowledgementEvidenceValid:latest&&prior?criticalAcknowledgementEvidenceValid(latest,prior):true,acknowledgementReplacementChainValid:replacementChainValid,acknowledgementChainForks:chainAudit.forks,acknowledgementChainAudit:chainAudit,acknowledgementSealingMaturity:sealingMaturity,acknowledgementSealingPolicy:sealingPolicy,latestAcknowledgement,acknowledgementLifecycle:Object.freeze(acknowledgementLifecycle),drift});
}

module.exports = { evaluateRolloutDecisionAcknowledgement, criticalAcknowledgementEvidenceValid, latestDistinctPair, acknowledgementReplacementChainValid, acknowledgementChainForks };
