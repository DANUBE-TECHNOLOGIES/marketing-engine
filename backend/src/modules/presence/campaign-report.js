"use strict";

const { buildNetworkCockpit } = require("./network-cockpit");

function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
function delta(after, before) { return number(after) - number(before); }

function summarizeExecutions(executions = []) {
  const summary = { total: executions.length, submitted: 0, verified: 0, skipped: 0, failed: 0, blocked_sensitive: 0, other: 0 };
  for (const row of executions) {
    const status = String(row.status || "other");
    if (Object.prototype.hasOwnProperty.call(summary, status)) summary[status] += 1;
    else summary.other += 1;
  }
  const processed = summary.submitted + summary.verified + summary.skipped + summary.failed + summary.blocked_sensitive + summary.other;
  return Object.freeze({ ...summary, processed, successRate: summary.total ? Math.round((summary.verified / summary.total) * 100) : 0 });
}

function buildCampaignReport(campaign, currentState, executions = [], options = {}) {
  const current = buildNetworkCockpit(currentState);
  const baseline = campaign?.baseline || campaign?.plan?.baseline || {};
  const beforeHealth = baseline.health || {};
  const beforeSummary = baseline.summary || {};
  const execution = summarizeExecutions(executions);
  const criticalPropagationAlerts = number(options.criticalPropagationAlerts);

  const comparison = Object.freeze({
    healthScore: Object.freeze({ before: number(beforeHealth.score), after: number(current.health.score), delta: delta(current.health.score, beforeHealth.score) }),
    coveragePercent: Object.freeze({ before: number(beforeSummary.coveragePercent), after: number(current.summary.coveragePercent), delta: delta(current.summary.coveragePercent, beforeSummary.coveragePercent) }),
    anomalies: Object.freeze({ before: number(beforeSummary.anomalies), after: number(current.summary.anomalies), delta: delta(current.summary.anomalies, beforeSummary.anomalies) }),
    propagationAlerts: Object.freeze({ before: number(beforeSummary.propagationAlerts), after: number(current.summary.propagationAlerts), delta: delta(current.summary.propagationAlerts, beforeSummary.propagationAlerts) }),
    openActions: Object.freeze({ before: number(beforeSummary.openActions), after: number(current.summary.openActions), delta: delta(current.summary.openActions, beforeSummary.openActions) })
  });

  const improved = comparison.healthScore.delta > 0 || comparison.coveragePercent.delta > 0 || comparison.anomalies.delta < 0;
  const regressed = comparison.healthScore.delta < 0 || comparison.coveragePercent.delta < 0 || comparison.anomalies.delta > 0;
  const outcome = regressed ? "regressed" : improved ? "improved" : "stable";

  return Object.freeze({
    campaignId: campaign.campaignId,
    status: campaign.status,
    generatedAt: new Date().toISOString(),
    outcome,
    pilotEvidence: Object.freeze({
      pilot: campaign?.pilot === true,
      preflightId: campaign?.preflightId || null,
      approvedScope: campaign?.approvedScope || null,
      criticalPropagationAlerts
    }),
    baseline: Object.freeze({ health: beforeHealth, summary: beforeSummary }),
    current: Object.freeze({ health: current.health, summary: current.summary }),
    comparison,
    execution,
    remainingPriorityItems: Object.freeze(current.interventionQueue.slice(0, 25))
  });
}

module.exports = { buildCampaignReport, summarizeExecutions, delta };
