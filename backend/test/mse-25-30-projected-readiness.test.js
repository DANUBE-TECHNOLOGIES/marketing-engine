"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  projectedLocalState,
  projectedReadiness,
} = require("../src/modules/minisite-seo-enrichment/projected-readiness-patch");

test("projected local state keeps score target diagnostic separate from blocking gaps", () => {
  const strong = projectedLocalState({
    score: 92,
    gaps: [{ severity: "medium", code: "minor" }],
    intentTargetQuality: { intents: [{ key: "agency", mapped: true, qualityStatus: "strong" }] },
  });
  assert.equal(strong.localSeoReady, true);
  assert.equal(strong.scoreTargetMet, true);
  assert.equal(strong.coreTargetWeak, false);

  const lowScore = projectedLocalState({
    score: 72,
    gaps: [{ severity: "medium", code: "quality-opportunity" }],
    intentTargetQuality: { intents: [{ key: "agency", mapped: true, qualityStatus: "strong" }] },
  });
  assert.equal(lowScore.localSeoReady, true);
  assert.equal(lowScore.localSeoScore, 72);
  assert.equal(lowScore.scoreTargetMet, false);

  const blocked = projectedLocalState({
    score: 92,
    gaps: [{ severity: "high", code: "homepage-title-locality-missing" }],
    intentTargetQuality: { intents: [{ key: "agency", mapped: true, qualityStatus: "weak" }] },
  });
  assert.equal(blocked.localSeoReady, false);
  assert.equal(blocked.scoreTargetMet, true);
  assert.equal(blocked.coreTargetWeak, true);
});

test("projected readiness removes only fixable current blockers after projected audit passes", () => {
  const current = {
    blocked: true,
    notReadyCount: 1,
    sites: [{
      siteSlug: "gien",
      readyToSubmit: false,
      blockers: ["local-seo-not-ready", "local-core-intent-target-quality-weak"],
    }],
    notReady: [{ siteSlug: "gien" }],
  };
  const coverage = {
    summary: { averageScore: 94 },
    sites: [{
      siteSlug: "gien",
      score: 94,
      gaps: [{ severity: "medium", code: "optional-warning" }],
      intentTargetQuality: { intents: [{ key: "agency", mapped: true, qualityStatus: "strong" }] },
    }],
  };

  const result = projectedReadiness(current, coverage);
  assert.equal(result.mode, "projected-after-mse-25.30");
  assert.equal(result.current.blocked, true);
  assert.equal(result.blocked, false);
  assert.equal(result.notReadyCount, 0);
  assert.equal(result.sites[0].currentReadyToSubmit, false);
  assert.equal(result.sites[0].readyToSubmit, true);
  assert.deepEqual(result.sites[0].blockers, []);
});

test("projected readiness allows rollout below score target when no hard blocker remains", () => {
  const current = {
    blocked: true,
    notReadyCount: 1,
    sites: [{
      siteSlug: "gien",
      readyToSubmit: false,
      blockers: ["local-seo-not-ready"],
    }],
    notReady: [{ siteSlug: "gien" }],
  };
  const coverage = {
    summary: { averageScore: 72 },
    sites: [{
      siteSlug: "gien",
      score: 72,
      gaps: [{ severity: "medium", code: "quality-opportunity" }],
      intentTargetQuality: { intents: [{ key: "agency", mapped: true, qualityStatus: "strong" }] },
    }],
  };

  const result = projectedReadiness(current, coverage);
  assert.equal(result.blocked, false);
  assert.equal(result.notReadyCount, 0);
  assert.equal(result.sites[0].readyToSubmit, true);
  assert.deepEqual(result.sites[0].blockers, []);
  assert.equal(result.sites[0].projectedLocalSeo.score, 72);
  assert.equal(result.sites[0].projectedLocalSeo.scoreTargetMet, false);
  assert.equal(result.sites[0].projectedLocalSeo.ready, true);
  assert.equal(result.projectedLocalSeoAverageScore, 72);
});

test("projected readiness preserves non-projectable technical blockers", () => {
  const current = {
    blocked: true,
    notReadyCount: 1,
    sites: [{
      siteSlug: "gien",
      readyToSubmit: false,
      blockers: ["orphaned-indexable-entries", "local-seo-not-ready"],
    }],
  };
  const coverage = {
    sites: [{
      siteSlug: "gien",
      score: 100,
      gaps: [],
      intentTargetQuality: { intents: [{ key: "agency", mapped: true, qualityStatus: "strong" }] },
    }],
  };

  const result = projectedReadiness(current, coverage);
  assert.equal(result.blocked, true);
  assert.deepEqual(result.sites[0].blockers, ["orphaned-indexable-entries"]);
});
