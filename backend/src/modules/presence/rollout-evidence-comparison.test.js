"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluatePredecessorNonRegression } = require("./rollout-evidence-comparison");

function report({ campaignId = "current", coverage = 100, health = 90, anomalies = 1, critical = 0 } = {}) {
  return {
    campaignId,
    current: { summary: { coveragePercent: coverage, anomalies }, health: { score: health } },
    pilotEvidence: { criticalPropagationAlerts: critical }
  };
}

test("rollout evidence is go when current stage does not regress predecessor", () => {
  const result = evaluatePredecessorNonRegression(report({ coverage: 100, health: 92, anomalies: 0 }), report({ campaignId: "previous", coverage: 100, health: 90, anomalies: 1 }));
  assert.equal(result.ready, true);
  assert.equal(result.predecessorCampaignId, "previous");
});

test("rollout evidence blocks coverage health anomalies and critical alert regressions", () => {
  const result = evaluatePredecessorNonRegression(report({ coverage: 95, health: 80, anomalies: 3, critical: 2 }), report({ coverage: 100, health: 90, anomalies: 1, critical: 0 }));
  assert.equal(result.ready, false);
  assert.ok(result.blockers.includes("rollout_coverage_regressed_vs_predecessor"));
  assert.ok(result.blockers.includes("rollout_health_regressed_vs_predecessor"));
  assert.ok(result.blockers.includes("rollout_anomalies_increased_vs_predecessor"));
  assert.ok(result.blockers.includes("rollout_critical_alerts_increased_vs_predecessor"));
});
