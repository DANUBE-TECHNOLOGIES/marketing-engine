"use strict";

function num(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }

function evaluatePredecessorNonRegression(currentReport = {}, predecessorReport = null) {
  if (!predecessorReport) return Object.freeze({ required: false, ready: true, decision: "go", blockers: Object.freeze([]), warnings: Object.freeze([]), predecessorCampaignId: null, comparison: null });
  const currentSummary = currentReport.current?.summary || {};
  const predecessorSummary = predecessorReport.current?.summary || {};
  const currentHealth = currentReport.current?.health || {};
  const predecessorHealth = predecessorReport.current?.health || {};
  const currentCritical = num(currentReport.pilotEvidence?.criticalPropagationAlerts);
  const predecessorCritical = num(predecessorReport.pilotEvidence?.criticalPropagationAlerts);
  const comparison = Object.freeze({
    coveragePercent: Object.freeze({ predecessor: num(predecessorSummary.coveragePercent), current: num(currentSummary.coveragePercent), delta: num(currentSummary.coveragePercent) - num(predecessorSummary.coveragePercent) }),
    healthScore: Object.freeze({ predecessor: num(predecessorHealth.score), current: num(currentHealth.score), delta: num(currentHealth.score) - num(predecessorHealth.score) }),
    anomalies: Object.freeze({ predecessor: num(predecessorSummary.anomalies), current: num(currentSummary.anomalies), delta: num(currentSummary.anomalies) - num(predecessorSummary.anomalies) }),
    criticalPropagationAlerts: Object.freeze({ predecessor: predecessorCritical, current: currentCritical, delta: currentCritical - predecessorCritical })
  });
  const blockers = [];
  if (comparison.coveragePercent.delta < 0) blockers.push("rollout_coverage_regressed_vs_predecessor");
  if (comparison.healthScore.delta < 0) blockers.push("rollout_health_regressed_vs_predecessor");
  if (comparison.anomalies.delta > 0) blockers.push("rollout_anomalies_increased_vs_predecessor");
  if (comparison.criticalPropagationAlerts.delta > 0) blockers.push("rollout_critical_alerts_increased_vs_predecessor");
  return Object.freeze({
    required: true,
    ready: blockers.length === 0,
    decision: blockers.length ? "no_go" : "go",
    blockers: Object.freeze(blockers),
    warnings: Object.freeze([]),
    predecessorCampaignId: predecessorReport.campaignId || null,
    comparison
  });
}

module.exports = { evaluatePredecessorNonRegression };
