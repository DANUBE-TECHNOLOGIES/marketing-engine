"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { networkRankingVisibilityTrend } = require("./network-ranking-visibility-trend");

test("aggregates only comparable agency windows", () => {
  const result = networkRankingVisibilityTrend([
    { agency: { id: 1, city: "Gien" }, checks: [{ code: "LOCAL_RANKINGS", visibilityTrend: { windows: [{ days: 30, comparable: true, top10Delta: 2, top20Delta: 3 }] } }] },
    { agency: { id: 2, city: "Nevers" }, checks: [{ code: "LOCAL_RANKINGS", visibilityTrend: { windows: [{ days: 30, comparable: false, top10Delta: null, top20Delta: null }] } }] },
    { agency: { id: 3, city: "Dax" }, checks: [{ code: "LOCAL_RANKINGS", visibilityTrend: { windows: [{ days: 30, comparable: true, top10Delta: -1, top20Delta: 0 }] } }] },
  ]);
  const month = result.windows.find((item) => item.days === 30);
  assert.equal(month.comparableAgencies, 2);
  assert.equal(month.top10Delta, 1);
  assert.equal(month.top20Delta, 3);
  assert.equal(month.improvingAgencies, 1);
  assert.equal(month.decliningAgencies, 1);
});

test("returns null deltas when no historical comparison exists", () => {
  const result = networkRankingVisibilityTrend([]);
  const month = result.windows.find((item) => item.days === 30);
  assert.equal(month.comparable, false);
  assert.equal(month.top10Delta, null);
  assert.equal(month.top20Delta, null);
});
