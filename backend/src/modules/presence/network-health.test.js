"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildNetworkHealth } = require("./network-health");

test("network health penalizes anomalies and propagation incidents", () => {
  const health = buildNetworkHealth({
    coverage: { summary: { coveragePercent: 90, total: 20 } },
    anomalyCount: 4,
    propagationAlerts: [{ severity: "slow" }, { severity: "stale" }, { severity: "critical" }]
  });
  assert.equal(health.coveragePercent, 90);
  assert.ok(health.score < 90);
  assert.equal(health.propagation.critical, 1);
  assert.equal(health.propagation.stale, 1);
});

test("perfect coverage without anomalies remains excellent", () => {
  const health = buildNetworkHealth({ coverage: { summary: { coveragePercent: 100, total: 10 } } });
  assert.equal(health.score, 100);
  assert.equal(health.grade, "excellent");
});
