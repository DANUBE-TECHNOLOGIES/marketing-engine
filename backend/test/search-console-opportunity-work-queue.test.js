"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { opportunityKey, MODE, ACTION_TYPE } = require("../src/modules/search-console-submission/opportunity-work-queue");

test("MSE-25.22 builds a stable per-site opportunity key", () => {
  assert.equal(opportunityKey({ siteSlug: "Gien", query: " Agence Voyage Gien " }), "gien::agence voyage gien");
});

test("MSE-25.24 supports deterministic local SEO audit work keys without pretending they are search queries", () => {
  assert.equal(opportunityKey({ siteSlug: "Gien", workKey: " local-seo:nap-incomplete:global " }), "gien::local-seo:nap-incomplete:global");
});

test("MSE-25.22 uses a dedicated manual work queue mode", () => {
  assert.equal(MODE, "seo-opportunity-work-queue");
  assert.equal(ACTION_TYPE, "seo-opportunity-work-item");
});

test("MSE-25.22 remains human-controlled and never mutates public content", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const source = fs.readFileSync(path.join(__dirname, "../src/modules/search-console-submission/opportunity-work-queue.js"), "utf8");
  assert.match(source, /humanValidationRequired: true/);
  assert.match(source, /automaticContentMutation: false/);
  assert.doesNotMatch(source, /publishPage|updatePage|savePage|pageBuilder/);
});
