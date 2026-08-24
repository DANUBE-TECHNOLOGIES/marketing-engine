"use strict";

function evaluatePilotOutcome(report = {}, options = {}) {
  const execution = report.execution || {};
  const comparison = report.comparison || {};
  const minVerificationRatePercent = Number(options.minimumVerificationRatePercent ?? 100);
  const maxFailedItems = Number(options.maximumFailedItems ?? 0);
  const maxCriticalPropagationAlerts = Number(options.maximumCriticalPropagationAlerts ?? 0);
  const minCoverageDelta = Number(options.minimumCoverageRegressionTolerancePoints ?? 0);
  const verificationRate = Number(execution.successRate ?? execution.verificationRate ?? 0);
  const failedItems = Number(execution.failed || 0);
  const coverageDelta = Number(comparison.coveragePercent?.delta || 0);
  const criticalPropagationAlerts = Number(options.criticalPropagationAlerts ?? 0);
  const blockers = [];
  const warnings = [];

  if (verificationRate < minVerificationRatePercent) blockers.push("verification_rate_below_target");
  if (failedItems > maxFailedItems) blockers.push("failed_items_above_target");
  if (criticalPropagationAlerts > maxCriticalPropagationAlerts) blockers.push("critical_propagation_alerts");
  if (coverageDelta < minCoverageDelta) blockers.push("coverage_regression");
  if (report.outcome === "regressed") blockers.push("campaign_regressed");
  if (report.status !== "completed") blockers.push("campaign_not_completed");
  if (Number(comparison.healthScore?.delta || 0) < 0) warnings.push("health_score_regressed");
  if (Number(comparison.anomalies?.delta || 0) > 0) warnings.push("anomalies_increased");

  return Object.freeze({
    readyForNetworkRollout: blockers.length === 0,
    decision: blockers.length ? "no_go" : "go",
    blockers: Object.freeze([...new Set(blockers)]),
    warnings: Object.freeze([...new Set(warnings)]),
    observed: Object.freeze({ verificationRatePercent: verificationRate, failedItems, criticalPropagationAlerts, coverageDeltaPoints: coverageDelta, campaignOutcome: report.outcome || "unknown", campaignStatus: report.status || "unknown" }),
    criteria: Object.freeze({ minimumVerificationRatePercent: minVerificationRatePercent, maximumFailedItems: maxFailedItems, maximumCriticalPropagationAlerts: maxCriticalPropagationAlerts, minimumCoverageRegressionTolerancePoints: minCoverageDelta })
  });
}

module.exports = { evaluatePilotOutcome };
