"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  metadataSummary,
  installSummaryConsistency,
} = require("../src/modules/minisite-seo-enrichment/summary-consistency-patch");

function page(slug) {
  return {
    slug,
    changes: [
      { blockType: "page", field: "seoTitle" },
      { blockType: "page", field: "metaDescription" },
      { blockType: "rich-text", field: "block" },
    ],
  };
}

test("metadataSummary counts only page-level metadata changes in retained plans", () => {
  const plans = [
    { pages: [page("home"), page("services")] },
    { pages: [page("destinations")] },
  ];
  assert.deepEqual(metadataSummary(plans), {
    metadataPagesChanged: 3,
    metadataFieldsChanged: 6,
  });
});

test("summary consistency replaces stale pre-exclusion metadata counters", async () => {
  class FakeService {
    async buildNetworkContentOptimization() {
      return {
        summary: {
          agenciesProcessed: 9,
          pagesChanged: 91,
          metadataPagesChanged: 91,
          metadataFieldsChanged: 182,
        },
        plans: [
          { pages: Array.from({ length: 40 }, (_, index) => page(`a-${index}`)) },
          { pages: Array.from({ length: 42 }, (_, index) => page(`b-${index}`)) },
        ],
      };
    }
  }

  installSummaryConsistency(FakeService);
  const result = await new FakeService().buildNetworkContentOptimization();
  assert.equal(result.summary.metadataPagesChanged, 82);
  assert.equal(result.summary.metadataFieldsChanged, 164);
  assert.equal(result.summary.pagesChanged, 91);
});
