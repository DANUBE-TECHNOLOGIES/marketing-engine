"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildQualityUpliftOperatorReport,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-operator-report");

function preview() {
  return {
    agencies: [
      {
        agencyId: 1,
        siteSlug: "mondescale-gien",
        city: "Gien",
        actions: [
          { pageSlug: "avis", priority: "high", priorityScore: 72, recommendedFields: ["body"] },
          { pageSlug: "services", priority: "medium", priorityScore: 42, recommendedFields: ["meta", "body"] },
        ],
        proposals: [
          {
            pageSlug: "avis",
            bodyCopyPreview: { html: "<p>Texte</p>" },
            operations: [{ type: "enrich-body" }, { type: "add-internal-link" }],
          },
          {
            pageSlug: "services",
            bodyCopyPreview: { html: "<p>Texte</p>" },
            operations: [{ type: "enrich-body" }, { type: "strengthen-meta-description" }],
          },
        ],
        impact: {
          pages: [
            { pageSlug: "avis", beforeWarnings: 3, projectedWarnings: 1, projectedReduction: 2, resolvedKinds: ["thin-content", "internal-link"], projectionComplete: true, nonSimulatedOperationTypes: [] },
            { pageSlug: "services", beforeWarnings: 2, projectedWarnings: 1, projectedReduction: 1, resolvedKinds: ["thin-content"], projectionComplete: false, nonSimulatedOperationTypes: ["strengthen-meta-description"] },
          ],
        },
      },
    ],
  };
}

test("operator report ranks priority before projected gain and stays read-only", () => {
  const result = buildQualityUpliftOperatorReport(preview());

  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.equal(result.summary.pageCount, 2);
  assert.equal(result.rows[0].pageSlug, "avis");
  assert.equal(result.rows[0].priorityScore, 72);
  assert.equal(result.rows[0].projectedReduction, 2);
});

test("operator report separates simulation-ready pages from manual metadata review", () => {
  const result = buildQualityUpliftOperatorReport(preview());

  assert.equal(result.summary.simulationReadyCount, 1);
  assert.equal(result.summary.manualReviewNeededCount, 1);
  assert.equal(result.simulationReady[0].pageSlug, "avis");
  assert.equal(result.simulationReady[0].executionClass, "simulation-ready");
  assert.equal(result.manualReviewNeeded[0].pageSlug, "services");
  assert.deepEqual(result.manualReviewNeeded[0].manualReviewReasons, ["strengthen-meta-description"]);
});

test("operator report never exposes internal page ids", () => {
  const source = preview();
  source.agencies[0].actions[0].pageId = "internal-page-id";
  source.agencies[0].proposals[0].pageId = "another-internal-id";

  const result = buildQualityUpliftOperatorReport(source);
  assert.equal(JSON.stringify(result).includes("internal-page-id"), false);
  assert.equal(JSON.stringify(result).includes("another-internal-id"), false);
});
