"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { attachLocalIntentTargetReadiness } = require("../src/modules/minisite-structured-data/local-intent-target-readiness");

function sitemap() { return { indexationReadiness: { sites: [{ siteSlug: "gien", readyToSubmit: true, blockers: [], warnings: [] }], readyToSubmit: true }, summary: {} }; }

test("MSE-25.28 blocks a site whose core local intent has no concrete page target", () => {
  const result = attachLocalIntentTargetReadiness(sitemap(), [{ siteSlug: "gien", coreIntentMapped: false, status: "weak", score: 30, mappedIntentCount: 2, intentCount: 7, diffuseIntents: ["agency"] }]);
  const site = result.indexationReadiness.sites[0];
  assert.equal(site.readyToSubmit, false);
  assert.ok(site.blockers.includes("local-core-intent-target-missing"));
});

test("MSE-25.28 warns for diffuse secondary intents without blocking a mapped core intent", () => {
  const result = attachLocalIntentTargetReadiness(sitemap(), [{ siteSlug: "gien", coreIntentMapped: true, status: "partial", score: 65, mappedIntentCount: 4, intentCount: 7, diffuseIntents: ["cruise"] }]);
  const site = result.indexationReadiness.sites[0];
  assert.equal(site.readyToSubmit, true);
  assert.ok(site.warnings.includes("local-intent-targets-diffuse"));
});
