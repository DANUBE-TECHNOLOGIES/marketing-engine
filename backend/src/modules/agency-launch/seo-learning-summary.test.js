"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  matureObservation,
  aggregateEffectiveness,
  seoLearningSummary,
} = require("./seo-learning-summary");

test("learning uses the most mature available impact window", () => {
  const observation = matureObservation({
    windows: [
      { days: 7, delta: 2, result: { position: 14 }, observation: "stable" },
      { days: 14, delta: 5, result: { position: 11 }, observation: "improved" },
      { days: 30, delta: null, result: null, observation: "insufficient_data" },
    ],
  });
  assert.equal(observation.days, 14);
  assert.equal(observation.delta, 5);
});

test("effectiveness groups report average gains and improvement rate", () => {
  const groups = aggregateEffectiveness([
    { source: "LOCAL_RANKINGS", code: "RANKING_NEAR_TOP10", delta: 5, observation: "improved" },
    { source: "LOCAL_RANKINGS", code: "RANKING_NEAR_TOP10", delta: 3, observation: "improved" },
    { source: "LOCAL_RANKINGS", code: "RANKING_NEAR_TOP10", delta: -1, observation: "stable" },
  ]);
  assert.equal(groups[0].samples, 3);
  assert.equal(groups[0].improvementRate, 0.667);
  assert.equal(groups[0].averageDelta, 2.3);
  assert.equal(groups[0].confidence, "low");
});

test("small samples are explicitly marked insufficient", () => {
  const summary = seoLearningSummary(
    [{ id: 1, source: "LOCAL_RANKINGS", code: "RANKING_NEAR_TOP10" }],
    [{ actionId: 1, windows: [{ days: 7, delta: 4, result: { position: 9 }, observation: "improved" }] }]
  );
  assert.equal(summary.measuredActions, 1);
  assert.equal(summary.groups[0].confidence, "insufficient");
  assert.match(summary.disclaimer, /corrélations/i);
});
