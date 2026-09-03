"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { attachLocalContentReadiness } = require("../src/modules/minisite-structured-data/local-content-readiness");

function ready() {
  return { summary: {}, indexationReadiness: { readyToSubmit: true, siteCount: 1, readySites: 1, blockedSites: 0, sites: [{ siteSlug: "gien", readyToSubmit: true, blockers: [], warnings: [] }] } };
}

test("MSE-25.25 blocks submission for high duplicate-content risk", () => {
  const result = attachLocalContentReadiness(ready(), { summary: { duplicateRiskSites: 1 }, sites: [{ siteSlug: "gien", status: "duplicate-risk", score: 8, strongestSimilarity: 0.92, duplicatePairCount: 1 }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, false);
  assert.ok(result.indexationReadiness.sites[0].blockers.includes("local-content-duplicate-risk"));
});

test("MSE-25.25 warns but does not block medium similarity review", () => {
  const result = attachLocalContentReadiness(ready(), { summary: { duplicateRiskSites: 0 }, sites: [{ siteSlug: "gien", status: "review", score: 20, strongestSimilarity: 0.8, duplicatePairCount: 1 }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, true);
  assert.ok(result.indexationReadiness.sites[0].warnings.includes("local-content-similarity-review"));
});

test("MSE-25.25 keeps differentiated local content ready", () => {
  const result = attachLocalContentReadiness(ready(), { summary: { duplicateRiskSites: 0 }, sites: [{ siteSlug: "gien", status: "unique", score: 100, strongestSimilarity: 0, duplicatePairCount: 0 }] });
  assert.equal(result.indexationReadiness.readyToSubmit, true);
  assert.equal(result.indexationReadiness.sites[0].localContentUniqueness.ready, true);
});
