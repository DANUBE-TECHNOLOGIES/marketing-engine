"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { installQualityUpliftPreview } = require("../src/modules/minisite-seo-enrichment/quality-uplift-preview-patch");

class FakeService {
  constructor() {
    this.repository = {
      listSites: async () => [
        { agencyId: 1, slug: "mondescale-gien", status: "published", agency: { id: 1, city: "Gien" } },
        { agencyId: 2, slug: "draft-site", status: "draft", agency: { id: 2, city: "Amilly" } },
      ],
    };
  }

  async buildAgencyContentOptimization({ agencyId }) {
    assert.equal(Number(agencyId), 1);
    return {
      agencyId: 1,
      siteSlug: "mondescale-gien",
      city: "Gien",
      excludedPages: [],
      pages: [
        {
          slug: "avis",
          title: "Avis clients",
          published: true,
          page: {
            slug: "avis",
            title: "Avis clients",
            published: true,
            status: "published",
            blocks: [],
          },
          currentBlocks: [
            { blockType: "hero", content: { title: "Avis clients à Gien" } },
            { blockType: "rich_text", content: { html: "Des avis clients à Gien." } },
          ],
        },
        {
          slug: "home",
          title: "Agence de voyages à Gien",
          published: true,
          page: {
            slug: "home",
            title: "Agence de voyages à Gien",
            seoTitle: "Agence de voyages à Gien",
            metaDescription: "Agence de voyages à Gien pour préparer votre prochain voyage.",
            published: true,
            status: "published",
            blocks: [],
          },
          currentBlocks: [
            { blockType: "hero", content: { title: "Agence de voyages à Gien" } },
            { blockType: "rich_text", content: { html: Array.from({ length: 130 }, () => "voyage").join(" ") } },
          ],
        },
      ],
    };
  }
}

installQualityUpliftPreview(FakeService);

test("agency preview exposes fact-safe body copy but no writes", async () => {
  const service = new FakeService();
  const result = await service.previewAgencyQualityUplift({ agencyId: 1, minimumWords: 120 });

  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.ok(result.actionSummary.actionCount >= 1);
  assert.ok(result.proposalSummary.proposalCount >= 1);
  assert.ok(result.proposalSummary.bodyCopyPreviewCount >= 1);
  assert.ok(Array.isArray(result.impact.pages));
  assert.ok(result.impact.pages.length >= 1);
  const avis = result.proposals.find((item) => item.pageSlug === "avis");
  assert.ok(avis);
  assert.ok(avis.bodyCopyPreview);
  assert.equal(avis.bodyCopyPreview.factualPolicy, "agency-and-page-context-only");
});

test("network preview excludes drafts and aggregates proposal and projected page counts without mutation", async () => {
  const service = new FakeService();
  const result = await service.previewNetworkQualityUplift({ minimumWords: 120 });
  const impactPages = result.agencies.flatMap((agency) => agency.impact?.pages || []);
  const pagesWithReduction = impactPages.filter((page) => Number(page.projectedReduction || 0) > 0).length;
  const fullyResolved = impactPages.filter(
    (page) => Number(page.beforeWarnings || 0) > 0 && Number(page.projectedWarnings || 0) === 0
  ).length;

  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.summary.agenciesProcessed, 1);
  assert.equal(result.summary.agenciesExcluded, 1);
  assert.equal(result.excludedSites[0].siteSlug, "draft-site");
  assert.ok(result.summary.pageActionCount >= 1);
  assert.ok(result.summary.proposalCount >= 1);
  assert.ok(result.summary.bodyCopyPreviewCount >= 1);
  assert.equal(result.summary.projectedPageCount, impactPages.length);
  assert.equal(
    result.summary.projectionCompletePageCount + result.summary.projectionPartialPageCount,
    result.summary.projectedPageCount
  );
  assert.equal(result.summary.pagesWithProjectedReductionCount, pagesWithReduction);
  assert.equal(result.summary.fullyResolvedPageCount, fullyResolved);
});
