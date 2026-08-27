"use strict";

function normalizeRequiredCoverage(value = process.env.PRESENCE_ACK_SEALING_MIN_PERCENT) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

function evaluateAcknowledgementSealingPolicy(maturity = {}, options = {}) {
  const requiredCoveragePercent = normalizeRequiredCoverage(options.requiredCoveragePercent);
  const versioned = maturity.versioned === true;
  const integrityReady = maturity.integrityReady !== false;
  const actualCoveragePercent = Number(maturity.explicitCoveragePercent || 0);
  const enforced = requiredCoveragePercent > 0;
  const applicable = enforced && versioned;
  const thresholdMet = !applicable || actualCoveragePercent >= requiredCoveragePercent;
  const ready = integrityReady && thresholdMet;
  const blockers = [];
  const warnings = [];

  if (applicable && !thresholdMet) blockers.push("acknowledgement_chain_sealing_below_required_threshold");
  if (!enforced && versioned && maturity.fullyExplicit !== true) warnings.push("acknowledgement_chain_sealing_policy_not_enforced");

  return Object.freeze({
    ready,
    enforced,
    applicable,
    requiredCoveragePercent,
    actualCoveragePercent,
    thresholdMet,
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings)
  });
}

module.exports = { normalizeRequiredCoverage, evaluateAcknowledgementSealingPolicy };
