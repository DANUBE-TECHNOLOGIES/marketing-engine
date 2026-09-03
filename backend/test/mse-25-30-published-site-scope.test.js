"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  installPublishedSiteScope,
  isPublishedSite,
  unpublishedSites,
} = require("../src/modules/minisite-seo-enrichment/published-site-scope-patch");

const longCopy = "Notre équipe accompagne chaque projet de voyage avec une analyse précise des priorités, des dates, du budget et des prestations utiles. ".repeat(4);

function page(siteSlug) {
  return {
    slug: "home",
    published: true,
    changed: true,
    optimizedBlocks: [{ type: "rich_text", content: { html: `<p>${siteSlug} ${longCopy}</p>` } }],
    changes: [],
  };
}

test("MSE-25.30 reconnaît uniquement AgencySite.status=published comme site public", () => {
  assert.equal(isPublishedSite({ status: "published" }), true);
  assert.equal(isPublishedSite({ status: "PUBLISHED" }), true);
  assert.equal(isPublishedSite({ status: "draft" }), false);
  assert.equal(isPublishedSite({ status: null }), false);
});

test("MSE-25.30 décrit les sites draft comme exclusions dynamiques traçables", () => {
  assert.deepEqual(unpublishedSites([
    { agencyId: 8, slug: "tui-store-melun", status: "draft", publishedAt: null, agency: { city: "Melun" } },
    { agencyId: 9, slug: "tui-store-amilly", status: "draft", publishedAt: null, agency: { city: "Amilly" } },
    { agencyId: 4, slug: "ambassade-fram-mondescale-gien", status: "published", agency: { city: "Gien" } },
  ]), [
    { agencyId: 8, siteSlug: "tui-store-melun", city: "Melun", status: "draft", publishedAt: null, reason: "site-not-published" },
    { agencyId: 9, siteSlug: "tui-store-amilly", city: "Amilly", status: "draft", publishedAt: null, reason: "site-not-published" },
  ]);
});

test("MSE-25.30 exclut automatiquement Amilly draft avant les gates réseau", async () => {
  class FakeService {
    constructor() {
      this.repository = {
        listSites: async () => [
          { agencyId: 4, slug: "ambassade-fram-mondescale-gien", status: "published", publishedAt: new Date(), agency: { id: 4, city: "Gien" } },
          { agencyId: 9, slug: "tui-store-amilly", status: "draft", publishedAt: null, agency: { id: 9, city: "Amilly" } },
        ],
      };
    }

    health() { return { status: "ok" }; }

    async buildNetworkContentOptimization() {
      return {
        version: "mse-25.30",
        plans: [
          { agencyId: 4, siteSlug: "ambassade-fram-mondescale-gien", city: "Gien", summary: { pagesProcessed: 1, pagesChanged: 1 }, pages: [page("gien")] },
          { agencyId: 9, siteSlug: "tui-store-amilly", city: "Amilly", summary: { pagesProcessed: 1, pagesChanged: 1 }, pages: [page("amilly")] },
        ],
        similarity: { conflictCount: 0, blockingConflictCount: 0, advisoryConflictCount: 0, blocked: false },
        quality: { blocking: [], warnings: [], blockingCount: 0, warningCount: 0, blocked: false },
        sitemapReadiness: {
          sites: [
            { siteSlug: "ambassade-fram-mondescale-gien", readyToSubmit: true },
            { siteSlug: "tui-store-amilly", readyToSubmit: false },
          ],
          notReady: [{ siteSlug: "tui-store-amilly", readyToSubmit: false }],
          notReadyCount: 1,
          blocked: true,
        },
        excludedSiteSlugs: [],
        excludedAgencies: [],
        summary: {},
      };
    }
  }

  installPublishedSiteScope(FakeService);
  const service = new FakeService();
  const result = await service.buildNetworkContentOptimization();

  assert.deepEqual(result.plans.map((item) => item.siteSlug), ["ambassade-fram-mondescale-gien"]);
  assert.deepEqual(result.excludedSiteSlugs, ["tui-store-amilly"]);
  assert.equal(result.excludedAgencies.length, 1);
  assert.equal(result.excludedAgencies[0].siteSlug, "tui-store-amilly");
  assert.equal(result.excludedAgencies[0].reason, "site-not-published");
  assert.equal(result.summary.agenciesProcessed, 1);
  assert.equal(result.summary.agenciesExcluded, 1);
  assert.equal(result.sitemapReadiness.blocked, false);
  assert.equal(service.health().publishedSiteScopeGuard, true);
});
