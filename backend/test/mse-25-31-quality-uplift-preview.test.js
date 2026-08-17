"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  installQualityUpliftPreview,
  siteFromAgencyPlan,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-preview-patch");

class FakeService {
  constructor() {
    this.repository = {
      listSites: async () => [
        { agencyId: 1, slug: "published-site", status: "published" },
        { agencyId: 2, slug: "draft-site", status: "draft" },
      ],
    };
  }

  async buildAgencyContentOptimization({ agencyId }) {
    assert.equal(Number(agencyId), 1);
    return {
      agencyId: 1,
      siteSlug: "published-site",
      city: "Gien",
      excludedPages: [{ slug: "contact", reason: "canonical-route-managed" }],
      pages: [
        {
          slug: "home",
          title: "Accueil",
          published: true,
          page: {
            slug: "home",
            title: "Accueil",
            status: "published",
            published: true,
            seoTitle: "Agence de voyages à Gien",
            metaDescription: "Agence de voyages à Gien.",
          },
          currentBlocks: [
            { blockType: "hero", content: { title: "Agence de voyages à Gien" } },
            { blockType: "rich_text", content: { html: "Conseils voyage à Gien." } },
          ],
        },
      ],
    };
  }
}

installQualityUpliftPreview(FakeService);

test("siteFromAgencyPlan exposes persisted blocks to the quality planner", () => {
  const site = siteFromAgencyPlan({
    agencyId: 7,
    siteSlug: "test-site",
    city: "Nevers",
    pages: [
      {
        slug: "services",
        published: true,
        page: { slug: "services", status: "published" },
        currentBlocks: [{ blockType: "rich_text", content: { html: "Texte réel" } }],
      },
    ],
  });

  assert.equal(site.slug, "test-site");
  assert.equal(site.agency.city, "Nevers");
  assert.equal(site.pages[0].blocks[0].content.html, "Texte réel");
});

test("network quality uplift preview excludes draft sites and remains read-only", async () => {
  const service = new FakeService();
  const preview = await service.previewNetworkQualityUplift({ minimumWords: 120 });

  assert.equal(preview.version, "mse-25.31");
  assert.equal(preview.operation, "preview-network-quality-uplift");
  assert.equal(preview.readOnly, true);
  assert.equal(preview.writes, false);
  assert.equal(preview.destructive, false);
  assert.equal(preview.summary.agenciesProcessed, 1);
  assert.equal(preview.summary.agenciesExcluded, 1);
  assert.equal(preview.excludedSites[0].siteSlug, "draft-site");
  assert.equal(preview.excludedSites[0].reason, "site-not-published");
  assert.equal(preview.agencies[0].siteSlug, "published-site");
  assert.ok(preview.summary.thinContentOpportunityCount >= 1);
});
