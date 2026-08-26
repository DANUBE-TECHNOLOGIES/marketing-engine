"use strict";

const { stableId } = require("./campaign-planner");

function compactPreflightRecoveryTrust(preflight) {
  const trust = preflight?.report?.recoveryTrust || null;
  const summary = trust?.summary || {};
  return Object.freeze({
    total: Number(summary.total || 0),
    healthy: Number(summary.healthy || 0),
    blocked: Number(summary.blocked || 0),
    critical: Number(summary.critical || 0),
    criticalCampaignIds: Object.freeze((trust?.campaigns || []).filter((c) => c.severity === "critical").map((c) => String(c.campaignId)).sort())
  });
}

function preflightRecoveryTrustFingerprint(preflight) {
  if (!preflight?.report?.recoveryTrust) return null;
  return stableId(compactPreflightRecoveryTrust(preflight));
}

function evaluatePreflightRecoveryTrustBinding(campaign, preflight) {
  if (campaign?.pilot !== true) return Object.freeze({ ready: true, decision: "go", required: false, blockers: Object.freeze([]) });
  const scope = campaign?.approvedScope || {};
  const expected = scope.preflightRecoveryTrustFingerprint || null;
  const current = preflightRecoveryTrustFingerprint(preflight);
  const blockers = [];
  if (!expected) blockers.push("campaign_preflight_recovery_trust_missing");
  if (!current) blockers.push("frozen_preflight_recovery_trust_missing");
  if (expected && current && expected !== current) blockers.push("campaign_preflight_recovery_trust_mismatch");
  const ready = blockers.length === 0;
  return Object.freeze({ ready, decision: ready ? "go" : "no_go", required: true, expected, current, snapshot: compactPreflightRecoveryTrust(preflight), blockers: Object.freeze(blockers) });
}

module.exports = { compactPreflightRecoveryTrust, preflightRecoveryTrustFingerprint, evaluatePreflightRecoveryTrustBinding };
