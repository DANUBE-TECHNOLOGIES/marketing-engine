"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { seoHealthScore } = require("./seo-health-score");

function report(overrides = {}) {
  return {
    checks: [
      { code: "LOCAL_RANKINGS", activeKeywords: 10, freshKeywords: 10, top10Keywords: 5, top20Keywords: 8, top10Rate: 0.5, top20Rate: 0.8, visibilityTrend: { windows: [{ days: 30, comparable: true, top10Delta: 2, top20Delta: 3 }] } },
      { code: "LOCAL_CITATIONS", consistencyRate: 1, passed: true },
      { code: "LOCAL_TRUST", reviewCount: 20, responseRate: 0.8, latestAgeDays: 10, freshnessTargetDays: 120 },
      { code: "LOCAL_CONTENT", passed: true },
      { code: "CONTENT_SIMILARITY", passed: true },
      ...(overrides.checks || []),
    ],
  };
}

test("healthy agency receives a strong score with explainable components", () => {
  const health = seoHealthScore(report());
  assert.ok(health.score >= 70);
  assert.equal(health.status, "healthy");
  assert.equal(health.components.length, 6);
  assert.equal(health.components.reduce((sum, item) => sum + item.weight, 0), 100);
});

test("declining sparse agency is flagged priority", () => {
  const health = seoHealthScore({
    checks: [
      { code: "LOCAL_RANKINGS", activeKeywords: 10, freshKeywords: 2, top10Keywords: 0, top20Keywords: 1, top10Rate: 0, top20Rate: 0.1, visibilityTrend: { windows: [{ days: 30, comparable: true, top10Delta: -2, top20Delta: -3 }] } },
      { code: "LOCAL_CITATIONS", consistencyRate: 0.4, passed: false },
      { code: "LOCAL_TRUST", reviewCount: 1, responseRate: 0, latestAgeDays: 300, freshnessTargetDays: 120 },
      { code: "LOCAL_CONTENT", passed: false },
      { code: "CONTENT_SIMILARITY", passed: false },
    ],
  });
  assert.ok(health.score < 50);
  assert.equal(health.status, "priority");
});

test("missing 30 day history stays neutral instead of being penalized", () => {
  const base = report();
  base.checks[0].visibilityTrend.windows[0] = { days: 30, comparable: false, top10Delta: null, top20Delta: null };
  const health = seoHealthScore(base);
  const trend = health.components.find((item) => item.code === "trend");
  assert.equal(trend.ratio, 0.5);
});
