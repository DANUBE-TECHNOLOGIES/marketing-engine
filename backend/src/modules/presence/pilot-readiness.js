"use strict";

function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}

function evaluatePilotReadiness(input = {}, criteria = {}) {
  const deployment = input.deploymentReadiness || {};
  const plan = input.plan || {};
  const maxAgencies = Number(criteria.maxAgencies || 3);
  const maxItems = Number(criteria.maxItems || 10);
  const minGoogleCoveragePercent = Number(criteria.minGoogleCoveragePercent || 80);
  const requireNoSensitive = criteria.requireNoSensitive !== false;
  const selectedAgencyIds = Array.isArray(plan.policy?.agencyIds) ? plan.policy.agencyIds : [];
  const sensitiveItems = (plan.selected || []).filter((item) => Array.isArray(item.drift) && item.drift.some((field) => field === "name" || field === "address"));
  const blockers = [];
  const warnings = [];

  if (!deployment.readyForGooglePilot) blockers.push("deployment_not_ready_for_google_pilot");
  if (!selectedAgencyIds.length) blockers.push("pilot_scope_has_no_agencies");
  if (selectedAgencyIds.length > maxAgencies) blockers.push("pilot_scope_too_large");
  if ((plan.selectedCount || 0) > maxItems) blockers.push("pilot_has_too_many_items");
  if (requireNoSensitive && sensitiveItems.length) blockers.push("pilot_contains_sensitive_name_or_address_changes");
  if ((deployment.googleCoveragePercent || 0) < minGoogleCoveragePercent) warnings.push("google_baseline_coverage_below_target");
  if ((plan.executableCount || 0) === 0) warnings.push("pilot_has_no_executable_items");
  if ((plan.manualCount || 0) > 0) warnings.push("pilot_contains_manual_items");

  return Object.freeze({
    ready: blockers.length === 0,
    decision: blockers.length ? "no_go" : "go",
    blockers: Object.freeze(blockers),
    warnings: Object.freeze(warnings),
    criteria: Object.freeze({ maxAgencies, maxItems, minGoogleCoveragePercent, requireNoSensitive }),
    scope: Object.freeze({ agencyCount: selectedAgencyIds.length, selectedItems: plan.selectedCount || 0, executableItems: plan.executableCount || 0, manualItems: plan.manualCount || 0, sensitiveItems: sensitiveItems.length }),
    baseline: Object.freeze({ googleCoveragePercent: deployment.googleCoveragePercent || 0, agencyCount: deployment.agencyCount || 0, googleListings: deployment.googleListings || 0 }),
    successThresholds: Object.freeze({ minimumVerificationRatePercent: 100, maximumFailedItems: 0, maximumCriticalPropagationAlerts: 0, minimumCoverageRegressionTolerancePoints: 0 }),
    summary: Object.freeze({ executablePercent: pct(plan.executableCount || 0, plan.selectedCount || 0) })
  });
}

module.exports = { evaluatePilotReadiness };
