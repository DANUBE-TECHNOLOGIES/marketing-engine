"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { attachLocalIntentTargetQualityReadiness } = require("../src/modules/minisite-structured-data/local-intent-target-quality-readiness");

function sitemap() { return { indexationReadiness: { sites: [{ siteSlug: "gien", readyToSubmit: true, blockers: [], warnings: [] }], siteCount: 1, readySites: 1, blockedSites: 0, readyToSubmit: true }, summary: {} }; }

test("MSE-25.29 blocks submission when the mapped core local intent target is SEO-weak", () => {
  const result = attachLocalIntentTargetQualityReadiness(sitemap(), { sites: [{ siteSlug: "gien", intentTargetQuality: { status: "weak", score: 45, coreTargetStrong: false, coreTargetQuality: { slug: "accueil", score: 45 }, intents: [{ key: "agency", mapped: true, qualityStatus: "weak" }] } }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, false);
  assert.ok(result.indexationReadiness.sites[0].blockers.includes("local-core-intent-target-quality-weak"));
});

test("MSE-25.29 treats partial core target quality as a warning", () => {
  const result = attachLocalIntentTargetQualityReadiness(sitemap(), { sites: [{ siteSlug: "gien", intentTargetQuality: { status: "partial", score: 70, coreTargetStrong: false, coreTargetQuality: { slug: "accueil", score: 70 }, intents: [{ key: "agency", mapped: true, qualityStatus: "partial" }] } }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, true);
  assert.ok(result.indexationReadiness.sites[0].warnings.includes("local-core-intent-target-quality-partial"));
});
