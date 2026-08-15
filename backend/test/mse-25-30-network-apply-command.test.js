"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  requireConfirmation,
  summarize,
} = require("../scripts/mse-25-30-network-apply");

test("MSE-25.30 network apply command refuses to run without explicit operator confirmation", () => {
  assert.throws(
    () => requireConfirmation("NO"),
    (error) => {
      assert.equal(error.code, "MSE_25_30_NETWORK_ROLLOUT_OPERATOR_CONFIRMATION_REQUIRED");
      return true;
    }
  );
  assert.doesNotThrow(() => requireConfirmation("YES"));
});

test("MSE-25.30 network apply summary preserves versioned write and SEO guard results", () => {
  const result = summarize({
    operation: "network-content-optimize",
    writes: true,
    versioned: true,
    summary: { agenciesProcessed: 2, pagesWritten: 7 },
    similarity: { threshold: 0.78, conflictCount: 0 },
    quality: { blockingCount: 0, warningCount: 3 },
    sitemapReadiness: { blocked: false, readyCount: 2, notReadyCount: 0 },
    agencies: [
      {
        agencyId: 1,
        siteSlug: "gien",
        pages: [
          { slug: "circuits", changed: true, version: 4 },
          { slug: "contact", changed: false, version: 2 },
        ],
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.versioned, true);
  assert.equal(result.summary.pagesWritten, 7);
  assert.equal(result.similarity.conflictCount, 0);
  assert.equal(result.quality.warningCount, 3);
  assert.equal(result.sitemapReadiness.notReadyCount, 0);
  assert.equal(result.agencies[0].pagesWritten, 1);
  assert.equal(result.agencies[0].pages[0].version, 4);
});
