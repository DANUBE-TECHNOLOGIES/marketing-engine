"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { rankingVisibilityTrend } = require("./ranking-visibility-trend");

test("computes top10 and top20 gains over 30 60 90 days", () => {
  const now = new Date("2026-08-11T12:00:00Z");
  const keywords = [
    { id: 1, results: [
      { position: 8, found: true, checkedAt: "2026-08-10T12:00:00Z" },
      { position: 14, found: true, checkedAt: "2026-07-10T12:00:00Z" },
      { position: 22, found: true, checkedAt: "2026-06-01T12:00:00Z" },
    ]},
    { id: 2, results: [
      { position: 18, found: true, checkedAt: "2026-08-10T12:00:00Z" },
      { position: 24, found: true, checkedAt: "2026-07-10T12:00:00Z" },
      { position: 30, found: true, checkedAt: "2026-05-01T12:00:00Z" },
    ]},
  ];
  const trend = rankingVisibilityTrend(keywords, now);
  assert.equal(trend.current.top10Keywords, 1);
  assert.equal(trend.current.top20Keywords, 2);
  assert.equal(trend.windows[0].top10Delta, 1);
  assert.equal(trend.windows[0].top20Delta, 2);
});

test("does not invent a delta when historical coverage is absent", () => {
  const now = new Date("2026-08-11T12:00:00Z");
  const trend = rankingVisibilityTrend([{ id: 1, results: [{ position: 9, found: true, checkedAt: "2026-08-10T12:00:00Z" }] }], now);
  assert.equal(trend.windows[0].comparable, false);
  assert.equal(trend.windows[0].top10Delta, null);
});
