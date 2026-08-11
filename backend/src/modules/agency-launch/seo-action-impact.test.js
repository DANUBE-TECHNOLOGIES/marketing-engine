"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  positionDelta,
  impactLabel,
  actionRankingImpact,
} = require("./seo-action-impact");

test("position delta is positive when rankings improve", () => {
  assert.equal(positionDelta({ position: 18 }, { position: 9 }), 9);
  assert.equal(impactLabel(9), "improved");
  assert.equal(impactLabel(-4), "declined");
  assert.equal(impactLabel(1), "stable");
});

test("action impact uses the latest baseline before execution and later checkpoints", () => {
  const impact = actionRankingImpact(
    {
      id: 42,
      keywordId: 7,
      keyword: "voyage sur mesure gien",
      executedAt: "2026-07-01T10:00:00Z",
    },
    [
      { position: 18, found: true, checkedAt: "2026-06-30T08:00:00Z" },
      { position: 14, found: true, checkedAt: "2026-07-08T09:00:00Z" },
      { position: 11, found: true, checkedAt: "2026-07-16T09:00:00Z" },
      { position: 8, found: true, checkedAt: "2026-08-02T09:00:00Z" },
    ]
  );

  assert.equal(impact.status, "observing");
  assert.equal(impact.baseline.position, 18);
  assert.equal(impact.windows[0].days, 7);
  assert.equal(impact.windows[0].result.position, 14);
  assert.equal(impact.windows[0].delta, 4);
  assert.equal(impact.windows[0].observation, "improved");
  assert.equal(impact.windows[2].result.position, 8);
  assert.equal(impact.windows[2].delta, 10);
});

test("actions without keyword or baseline remain explicitly unmeasurable", () => {
  const withoutKeyword = actionRankingImpact({ id: 1, executedAt: "2026-07-01T00:00:00Z" }, []);
  assert.equal(withoutKeyword.status, "unmeasurable");

  const withoutBaseline = actionRankingImpact(
    { id: 2, keywordId: 3, executedAt: "2026-07-01T00:00:00Z" },
    [{ position: 9, found: true, checkedAt: "2026-07-10T00:00:00Z" }]
  );
  assert.equal(withoutBaseline.status, "insufficient_baseline");
});

test("impact output explicitly avoids claiming causality", () => {
  const impact = actionRankingImpact(
    { id: 3, keywordId: 3, executedAt: "2026-07-01T00:00:00Z" },
    [{ position: 10, found: true, checkedAt: "2026-06-30T00:00:00Z" }]
  );
  assert.match(impact.disclaimer, /ne prouve pas.*causal/i);
});
