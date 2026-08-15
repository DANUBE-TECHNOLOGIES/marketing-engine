"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { attachLocalSeoReadiness } = require("../src/modules/minisite-structured-data/local-seo-readiness");

function technicalReady() {
  return {
    summary: {},
    indexationReadiness: {
      readyToSubmit: true,
      siteCount: 1,
      readySites: 1,
      blockedSites: 0,
      sites: [{ siteSlug: "gien", readyToSubmit: true, blockers: [], warnings: [] }],
    },
  };
}

test("MSE-25.24 blocks sitemap submission when local SEO has critical or high gaps", () => {
  const result = attachLocalSeoReadiness(technicalReady(), { summary: { averageScore: 60 }, sites: [{ siteSlug: "gien", score: 60, status: "weak", gaps: [{ code: "nap-incomplete", severity: "critical" }] }] });
  assert.equal(result.indexationReadiness.readyToSubmit, false);
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, false);
  assert.ok(result.indexationReadiness.sites[0].blockers.includes("local-seo-not-ready"));
});

test("MSE-25.24 preserves technical readiness when local SEO is strong", () => {
  const result = attachLocalSeoReadiness(technicalReady(), { summary: { averageScore: 100 }, sites: [{ siteSlug: "gien", score: 100, status: "strong", gaps: [] }] });
  assert.equal(result.indexationReadiness.readyToSubmit, true);
  assert.equal(result.indexationReadiness.sites[0].localSeo.ready, true);
});

test("MSE-25.24 keeps medium local gaps as warnings rather than hidden defects", () => {
  const result = attachLocalSeoReadiness(technicalReady(), { summary: { averageScore: 93 }, sites: [{ siteSlug: "gien", score: 93, status: "strong", gaps: [{ code: "homepage-meta-locality-missing", severity: "medium" }] }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, true);
  assert.ok(result.indexationReadiness.sites[0].warnings.includes("local-seo:homepage-meta-locality-missing"));
});
