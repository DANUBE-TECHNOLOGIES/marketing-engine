"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyHistoryTrend, buildHistoryTrendReport } = require("../src/modules/minisite-semantic-engine/search-demand-history-trend");

function history(overrides = {}) {
  return {
    historyFingerprint: "history-fp",
    readOnly: true,
    writes: false,
    snapshotCount: 2,
    latest: { dataState: "DATA_AVAILABLE", analyticsRowCount: 20, humanReviewEligibleCount: 1 },
    previous: { dataState: "DATA_AVAILABLE", analyticsRowCount: 20, humanReviewEligibleCount: 1 },
    change: { analyticsRowDelta: 0, humanReviewEligibleDelta: 0 },
    policy: { automaticWrites: false },
    ...overrides,
  };
}

test("waiting Search Console history remains waiting, not no demand", () => {
  assert.equal(classifyHistoryTrend(history({ latest: { dataState: "NO_DATA_YET", humanReviewEligibleCount: 0 } })), "WAITING_FOR_DATA");
});

test("first real Search Console dataset is classified as data appeared", () => {
  assert.equal(classifyHistoryTrend(history({ previous: { dataState: "NO_DATA_YET", humanReviewEligibleCount: 0 } })), "DATA_APPEARED");
});

test("review queue growth is observable but never automatic", () => {
  const report = buildHistoryTrendReport({ history: history({ change: { analyticsRowDelta: 10, humanReviewEligibleDelta: 2 }, latest: { dataState: "DATA_AVAILABLE", analyticsRowCount: 30, humanReviewEligibleCount: 3 } }) });
  assert.equal(report.trend, "REVIEW_QUEUE_GROWING");
  assert.equal(report.reviewRequired, true);
  assert.equal(report.writes, false);
  assert.equal(report.policy.automaticWrites, false);
});

test("stable history remains observational", () => {
  const report = buildHistoryTrendReport({ history: history() });
  assert.equal(report.trend, "STABLE");
  assert.equal(report.reviewRequired, true);
  assert.equal(report.policy.trendIsObservationOnly, true);
});

test("unsafe history fails closed", () => {
  assert.throws(() => buildHistoryTrendReport({ history: history({ writes: true }) }), /read-only/);
});
