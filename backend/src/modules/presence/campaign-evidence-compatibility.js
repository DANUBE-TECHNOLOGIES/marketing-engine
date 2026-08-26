"use strict";

function evaluateCampaignEvidenceCompatibility(campaign, report) {
  if (campaign?.pilot !== true) return Object.freeze({ compatible: true, decision: "compatible", legacy: false, regenerationRequired: false, blockers: Object.freeze([]), guidance: null });
  const scope = campaign?.approvedScope || {};
  const evidence = report?.pilotEvidence || {};
  const binding = evidence.preflightRecoveryTrustBinding || null;
  const blockers = [];
  const legacyBlockers = [];
  const expected = scope.preflightRecoveryTrustFingerprint || null;

  if (!campaign?.preflightId) legacyBlockers.push("legacy_campaign_preflight_missing");
  if (!expected) legacyBlockers.push("legacy_campaign_preflight_recovery_trust_missing");
  if (!evidence.networkRecoveryTrust) legacyBlockers.push("legacy_report_network_recovery_trust_missing");
  if (!evidence.preflightRecoveryTrustFingerprint) legacyBlockers.push("legacy_report_preflight_recovery_trust_missing");
  if (!binding) legacyBlockers.push("legacy_report_preflight_binding_missing");

  if (campaign?.preflightId && evidence.preflightId && evidence.preflightId !== campaign.preflightId) blockers.push("report_preflight_id_mismatch");
  if (expected && evidence.preflightRecoveryTrustFingerprint && evidence.preflightRecoveryTrustFingerprint !== expected) blockers.push("report_preflight_recovery_trust_mismatch");
  if (binding) {
    if (binding.ready !== true) blockers.push("report_preflight_binding_no_go");
    if (expected && binding.expected !== expected) blockers.push("report_preflight_binding_expected_mismatch");
    if (expected && binding.current !== expected) blockers.push("report_preflight_binding_current_mismatch");
  }
  if (Number(evidence?.networkRecoveryTrust?.critical || 0) > 0) blockers.push("report_frozen_with_critical_recovery_trust");

  const all = [...new Set([...legacyBlockers, ...blockers])];
  const legacy = legacyBlockers.length > 0;
  const compatible = all.length === 0;
  const decision = compatible ? "compatible" : legacy ? "legacy_requires_regeneration" : "invalid";
  const guidance = compatible ? null : legacy
    ? "Créer un nouveau préflight puis une nouvelle campagne. La preuve historique reste immutable et ne doit pas être enrichie rétroactivement."
    : "La preuve est incohérente. Ne pas la promouvoir ni la modifier ; créer une nouvelle campagne à partir d’un préflight conforme.";
  return Object.freeze({ compatible, decision, legacy, regenerationRequired: !compatible, blockers: Object.freeze(all), guidance });
}

module.exports = { evaluateCampaignEvidenceCompatibility };
