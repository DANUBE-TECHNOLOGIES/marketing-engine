"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSeoActionPlan } = require("../src/modules/minisite-semantic-engine/seo-action-plan");

function qualification() {
  return {
    qualificationFingerprint: "q".repeat(64),
    readOnly: true,
    writes: false,
    policy: { automaticWrites: false },
    gaps: [{ siteSlug: "gien", agencyId: 4, city: "Gien", intentKey: "cruise", bestPageSlug: "home", gapReason: "intent-weak", residualSuppressionReason: "home-secondary-fill-prohibited", disposition: "observe" }],
    orphans: [{ siteSlug: "gien", agencyId: 4, city: "Gien", pageSlug: "engagements", disposition: "human-review" }],
    cannibalization: [{ siteSlug: "gien", agencyId: 4, city: "Gien", intentKey: "agency", severity: "medium", blocking: false, pages: [{ slug: "agence" }, { slug: "home" }, { slug: "contact" }] }],
  };
}

test("action plan keeps observed gaps and non-blocking overlaps non executable", () => {
  const report = buildSeoActionPlan(qualification());
  assert.equal(report.readOnly, true);
  assert.equal(report.writes, false);
  assert.equal(report.summary.monitoredGapCount, 1);
  assert.equal(report.summary.orphanReviewCount, 1);
  assert.equal(report.summary.cannibalizationMonitorCount, 1);
  assert.equal(report.summary.blockingCannibalizationReviewCount, 0);
  assert.equal(report.summary.actionableReviewCount, 1);
  assert.equal(report.actionable[0].signalType, "semantic-orphan");
  assert.equal(report.summary.automaticWriteCount, 0);
});

test("blocking cannibalization becomes reviewable but never automatic", () => {
  const source = qualification();
  source.cannibalization[0] = { ...source.cannibalization[0], severity: "high", blocking: true };
  const report = buildSeoActionPlan(source);
  assert.equal(report.summary.blockingCannibalizationReviewCount, 1);
  assert.equal(report.cannibalizationActions[0].action, "decide-canonical-intent-owner");
  assert.equal(report.cannibalizationActions[0].automaticWrite, false);
});

test("action plan fails closed on unsafe qualification", () => {
  assert.throws(() => buildSeoActionPlan({ ...qualification(), writes: true }), /read-only/);
});
