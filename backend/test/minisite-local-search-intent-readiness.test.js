"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { attachLocalSearchIntentReadiness } = require("../src/modules/minisite-structured-data/local-search-intent-readiness");

function sitemap() { return { indexationReadiness: { sites: [{ siteSlug: "gien", readyToSubmit: true, blockers: [], warnings: [] }], siteCount: 1, readySites: 1, blockedSites: 0, readyToSubmit: true }, summary: {} }; }

test("MSE-25.27 blocks submission when the core agency plus city intent is absent", () => {
  const result = attachLocalSearchIntentReadiness(sitemap(), { sites: [{ siteSlug: "gien", searchIntentCoverage: { status: "weak", score: 30, coveredIntentCount: 2, intentCount: 7, intents: [{ key: "agency", localQualified: false }] } }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, false);
  assert.ok(result.indexationReadiness.sites[0].blockers.includes("local-core-search-intent-missing"));
});

test("MSE-25.27 keeps secondary intent gaps as warnings when the core local agency intent exists", () => {
  const result = attachLocalSearchIntentReadiness(sitemap(), { sites: [{ siteSlug: "gien", searchIntentCoverage: { status: "partial", score: 65, coveredIntentCount: 4, intentCount: 7, intents: [{ key: "agency", localQualified: true }] } }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, true);
  assert.ok(result.indexationReadiness.sites[0].warnings.includes("local-search-intent-coverage-partial"));
});
