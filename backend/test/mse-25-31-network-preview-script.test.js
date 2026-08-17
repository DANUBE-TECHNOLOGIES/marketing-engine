"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeOrigin,
  operatorOutput,
  positiveInteger,
} = require("../scripts/mse-25-31-network-preview");

test("network preview command normalizes origin and positive limits", () => {
  assert.equal(normalizeOrigin("http://127.0.0.1:4000///"), "http://127.0.0.1:4000");
  assert.equal(positiveInteger("5", 20), 5);
  assert.equal(positiveInteger("0", 20), 20);
  assert.equal(positiveInteger("bad", 20), 20);
});

test("operator output preserves read-only safety and ranking", () => {
  const payload = {
    version: "mse-25.31",
    operation: "preview-network-quality-uplift",
    readOnly: true,
    writes: false,
    destructive: false,
    planFingerprint: "abc123",
    minimumWords: 120,
    summary: { pageActionCount: 2 },
    excludedSites: [{ siteSlug: "draft" }],
    operatorReport: {
      summary: { pageCount: 2, simulationReadyCount: 1, manualReviewNeededCount: 1 },
      rows: [
        { siteSlug: "gien", pageSlug: "avis", priority: "high", priorityScore: 72, projectedReduction: 2, executionClass: "simulation-ready", operationTypes: ["enrich-body"] },
        { siteSlug: "gien", pageSlug: "services", priority: "medium", priorityScore: 42, projectedReduction: 1, executionClass: "manual-review-needed", operationTypes: ["strengthen-meta-description"], manualReviewReasons: ["strengthen-meta-description"] },
      ],
      manualReviewNeeded: [
        { siteSlug: "gien", pageSlug: "services", priority: "medium", priorityScore: 42, projectedReduction: 1, executionClass: "manual-review-needed", operationTypes: ["strengthen-meta-description"], manualReviewReasons: ["strengthen-meta-description"] },
      ],
    },
  };

  const result = operatorOutput(payload, { topPages: 1 });
  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.equal(result.planFingerprint, "abc123");
  assert.equal(result.topPages.length, 1);
  assert.equal(result.topPages[0].pageSlug, "avis");
  assert.equal(result.manualReviewNeeded[0].pageSlug, "services");
});

test("operator output refuses to report unsafe payload as ok", () => {
  const result = operatorOutput({ readOnly: false, writes: true, operatorReport: { rows: [] } });
  assert.equal(result.ok, false);
  assert.equal(result.writes, true);
});
