"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { MiniSiteSeoEnrichmentService } = require("../src/modules/minisite-seo-enrichment/service");

test("MSE-25.30 reuses minisite structured-data readiness before rollout", async () => {
  const structuredDataService = {
    previewSitemap: async () => ({
      entries: [{ url: "/agence/gien" }, { url: "/agence/nevers" }],
      indexationReadiness: {
        sites: [
          { siteSlug: "gien", readyToSubmit: true },
          { siteSlug: "nevers", readyToSubmit: false, blockers: ["orphan-page"] },
        ],
      },
    }),
  };
  const service = new MiniSiteSeoEnrichmentService({ repository: {}, structuredDataService });
  const readiness = await service.buildSitemapReadiness();
  assert.equal(readiness.available, true);
  assert.equal(readiness.blocked, true);
  assert.equal(readiness.notReadyCount, 1);
  assert.equal(readiness.notReady[0].siteSlug, "nevers");
  assert.equal(readiness.entryCount, 2);
});

test("MSE-25.30 network rollout refuses writes when sitemap readiness is false", async () => {
  const service = new MiniSiteSeoEnrichmentService({ repository: {} });
  service.buildNetworkContentOptimization = async () => ({
    similarity: { blocked: false, conflictCount: 0 },
    quality: { blocked: false, blockingCount: 0, warningCount: 0 },
    sitemapReadiness: { blocked: true, notReadyCount: 1, notReady: [{ siteSlug: "nevers", readyToSubmit: false }] },
    summary: { rolloutBlocked: true },
    plans: [],
  });

  await assert.rejects(
    () => service.optimizeNetworkContent({ dryRun: false, confirm: true }),
    (error) => {
      assert.equal(error.status, 409);
      assert.equal(error.code, "MINISITE_SEO_NETWORK_SITEMAP_READINESS_BLOCKED");
      assert.equal(error.details.notReadyCount, 1);
      return true;
    }
  );
});
