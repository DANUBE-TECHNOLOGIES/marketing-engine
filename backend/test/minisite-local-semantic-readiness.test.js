"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { attachLocalSemanticReadiness } = require("../src/modules/minisite-structured-data/local-semantic-readiness");

function sitemap() { return { indexationReadiness: { sites: [{ siteSlug: "gien", readyToSubmit: true, blockers: [], warnings: [] }], siteCount: 1, readySites: 1, blockedSites: 0, readyToSubmit: true }, summary: {} }; }

test("MSE-25.26 blocks a technically ready site when local semantic content is shallow", () => {
  const result = attachLocalSemanticReadiness(sitemap(), { sites: [{ siteSlug: "gien", semanticDepth: { status: "shallow", depthScore: 40, wordCount: 75 } }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, false);
  assert.ok(result.indexationReadiness.sites[0].blockers.includes("local-semantic-depth-insufficient"));
});

test("MSE-25.26 keeps partial semantic depth as a warning", () => {
  const result = attachLocalSemanticReadiness(sitemap(), { sites: [{ siteSlug: "gien", semanticDepth: { status: "partial", depthScore: 60, wordCount: 150 } }] });
  assert.equal(result.indexationReadiness.sites[0].readyToSubmit, true);
  assert.ok(result.indexationReadiness.sites[0].warnings.includes("local-semantic-depth-partial"));
});
