"use strict";

const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function asTime(value) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
}

function trustSummary(value) {
  const trust = value || {};
  return Object.freeze({
    total: Number(trust?.summary?.total ?? trust?.total ?? 0),
    blocked: Number(trust?.summary?.blocked ?? trust?.blocked ?? 0),
    critical: Number(trust?.summary?.critical ?? trust?.critical ?? 0)
  });
}

function evaluatePilotActivationGate({ preflight, currentReadiness, now = new Date(), maxAgeMs = DEFAULT_MAX_AGE_MS } = {}) {
  const blockers = [];
  const warnings = [];
  const preflightCreatedAt = asTime(preflight?.createdAt);
  const nowMs = asTime(now) || Date.now();
  const ageMs = preflightCreatedAt == null ? null : Math.max(0, nowMs - preflightCreatedAt);

  if (!preflight) blockers.push("frozen_preflight_missing");
  if (preflight && preflight.readOnlyReady !== true) blockers.push("frozen_preflight_not_ready");
  if (preflight && preflight.googleWritesEnabled === true) blockers.push("frozen_preflight_was_not_read_only");
  if (ageMs == null) blockers.push("frozen_preflight_timestamp_missing");
  else if (ageMs > maxAgeMs) blockers.push("frozen_preflight_expired");

  if (currentReadiness?.pilot?.readyForReadOnlyPreflight !== true) blockers.push("current_readiness_regressed");
  if (currentReadiness?.operational?.readyForGoogleApi !== true) blockers.push("google_api_not_ready");
  if (currentReadiness?.operational?.googleWritesEnabled !== true) blockers.push("google_write_kill_switch_disabled");
  if (currentReadiness?.pilot?.readyForGooglePilot !== true) blockers.push("current_google_pilot_not_ready");

  const frozenNetwork = preflight?.report?.network || null;
  const currentNetwork = currentReadiness?.network || null;
  if (frozenNetwork && currentNetwork) {
    if (frozenNetwork.agencyCount !== currentNetwork.agencyCount) warnings.push("agency_count_changed_since_preflight");
    if (frozenNetwork.googleListingCount !== currentNetwork.googleListingCount) warnings.push("google_listing_count_changed_since_preflight");
  }

  const frozenTrustRaw = preflight?.report?.networkRecoveryTrust || null;
  const currentTrustRaw = currentReadiness?.networkRecoveryTrust || null;
  if (!frozenTrustRaw) blockers.push("frozen_preflight_recovery_trust_missing");
  if (!currentTrustRaw) blockers.push("current_recovery_trust_missing");
  const frozenTrust = trustSummary(frozenTrustRaw);
  const currentTrust = trustSummary(currentTrustRaw);
  if (frozenTrust.critical > 0) blockers.push("frozen_preflight_had_critical_recovery_trust");
  if (currentTrust.critical > 0) blockers.push("critical_recovery_trust_since_preflight");
  if (currentTrust.blocked > frozenTrust.blocked) warnings.push("recovery_trust_blockers_increased_since_preflight");
  if (currentTrust.total !== frozenTrust.total) warnings.push("recovery_campaign_count_changed_since_preflight");

  return Object.freeze({
    ready: blockers.length === 0,
    decision: blockers.length ? "NO-GO" : "GO",
    blockers: Object.freeze([...new Set(blockers)]),
    warnings: Object.freeze([...new Set(warnings)]),
    preflightId: preflight?.preflightId || null,
    preflightAgeMs: ageMs,
    maxAgeMs,
    recoveryTrust: Object.freeze({ frozen: frozenTrust, current: currentTrust }),
    current: Object.freeze({
      readOnlyReady: currentReadiness?.pilot?.readyForReadOnlyPreflight === true,
      googleApiReady: currentReadiness?.operational?.readyForGoogleApi === true,
      googleWritesEnabled: currentReadiness?.operational?.googleWritesEnabled === true,
      googlePilotReady: currentReadiness?.pilot?.readyForGooglePilot === true
    })
  });
}

module.exports = { DEFAULT_MAX_AGE_MS, trustSummary, evaluatePilotActivationGate };
