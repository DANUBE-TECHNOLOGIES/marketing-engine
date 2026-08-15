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

test("MSE-25.30 network apply summary preserves versioned write, guards, exclusions, expected public changes and rollback manifest", () => {
  const result = summarize({
    operation: "network-content-optimize",
    writes: true,
    versioned: true,
    rollbackReady: true,
    summary: { agenciesProcessed: 2, pagesWritten: 7, rollbackSnapshots: 7 },
    similarity: { threshold: 0.78, conflictCount: 0 },
    quality: { blockingCount: 0, warningCount: 3 },
    sitemapReadiness: { blocked: false, readyCount: 2, notReadyCount: 0 },
    agencies: [
      {
        agencyId: 1,
        siteSlug: "gien",
        excludedPages: [
          {
            pageId: 102,
            slug: "mentions-legales",
            title: "Mentions légales",
            reason: "noindex-page",
          },
          {
            pageId: 104,
            slug: "inspiration",
            title: "Inspirations",
            reason: "canonical-route-managed",
          },
        ],
        pages: [
          {
            slug: "circuits",
            changed: true,
            version: 5,
            rollbackVersion: 4,
            rollbackVersionId: 104,
            changes: [
              { blockId: 12, blockType: "hero", field: "title", previous: "Circuits", next: "Circuits à Gien" },
              { blockId: 12, blockType: "hero", field: "subtitle", previous: "", next: "Introduction locale" },
            ],
          },
          { slug: "contact", changed: false, version: 2 },
        ],
      },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.versioned, true);
  assert.equal(result.rollbackReady, true);
  assert.equal(result.summary.pagesWritten, 7);
  assert.equal(result.summary.rollbackSnapshots, 7);
  assert.equal(result.similarity.conflictCount, 0);
  assert.equal(result.quality.warningCount, 3);
  assert.equal(result.sitemapReadiness.notReadyCount, 0);
  assert.equal(result.agencies[0].pagesWritten, 1);
  assert.deepEqual(result.agencies[0].excludedPages, [
    {
      slug: "mentions-legales",
      title: "Mentions légales",
      reason: "noindex-page",
    },
    {
      slug: "inspiration",
      title: "Inspirations",
      reason: "canonical-route-managed",
    },
  ]);
  assert.equal(Object.hasOwn(result.agencies[0].excludedPages[0], "pageId"), false);
  assert.equal(result.agencies[0].pages[0].version, 5);
  assert.equal(result.agencies[0].pages[0].rollbackVersionId, 104);
  assert.deepEqual(result.agencies[0].pages[0].expectedChanges, [
    { blockId: 12, blockType: "hero", field: "title", previous: "Circuits", next: "Circuits à Gien" },
    { blockId: 12, blockType: "hero", field: "subtitle", previous: "", next: "Introduction locale" },
  ]);
  assert.deepEqual(result.rollbackManifest, [
    {
      agencyId: 1,
      siteSlug: "gien",
      slug: "circuits",
      appliedVersion: 5,
      rollbackVersion: 4,
      rollbackVersionId: 104,
    },
  ]);
});
