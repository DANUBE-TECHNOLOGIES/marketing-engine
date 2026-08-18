"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  exactHeroTarget,
  installQualityUpliftPreview,
  internalLinkLabel,
  sealInternalLinkOperation,
  sealOperationFinalValue,
  sha256Text,
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
            { id: "hero-home", blockType: "hero", content: { title: "Agence de voyages à Gien" } },
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

test("exact metadata operations seal deterministic write targets, source fingerprints and final values", () => {
  const site = {
    agency: { id: 1, name: "Mondescale Gien", city: "Gien" },
  };
  const page = {
    slug: "croisieres",
    title: "Croisières",
    seoTitle: "Croisières",
    metaDescription: "Découvrez nos croisières.",
    blocks: [
      { id: "hero-cruises", blockType: "hero", content: { title: "Croisières" } },
      { id: "copy-cruises", blockType: "rich_text", content: { html: "Texte" } },
    ],
  };

  const title = sealOperationFinalValue({ type: "strengthen-title" }, site, page);
  const meta = sealOperationFinalValue({ type: "strengthen-meta-description" }, site, page);
  const h1 = sealOperationFinalValue({ type: "strengthen-h1" }, site, page);

  assert.deepEqual(title.target, { scope: "page", field: "seoTitle" });
  assert.equal(title.sourceValueFingerprint, sha256Text("Croisières"));
  assert.ok(String(title.finalValue || "").includes("Gien"));
  assert.deepEqual(meta.target, { scope: "page", field: "metaDescription" });
  assert.equal(meta.sourceValueFingerprint, sha256Text("Découvrez nos croisières."));
  assert.ok(String(meta.finalValue || "").includes("Gien"));
  assert.deepEqual(h1.target, {
    scope: "block",
    blockType: "hero",
    blockId: "hero-cruises",
    field: "title",
  });
  assert.equal(h1.sourceValueFingerprint, sha256Text("Croisières"));
  assert.ok(String(h1.finalValue || "").includes("Gien"));
});

test("H1 sealing is fail-closed when the hero target is ambiguous or has no exact id", () => {
  assert.equal(exactHeroTarget({ blocks: [] }), null);
  assert.equal(exactHeroTarget({
    blocks: [
      { id: "hero-a", blockType: "hero", content: {} },
      { id: "hero-b", blockType: "hero", content: {} },
    ],
  }), null);

  const target = exactHeroTarget({ blocks: [{ blockType: "hero", content: {} }] });
  assert.deepEqual(target, {
    scope: "block",
    blockType: "hero",
    blockId: null,
    field: "title",
  });
  const sealed = sealOperationFinalValue(
    { type: "strengthen-h1" },
    { agency: { city: "Gien" } },
    { slug: "home", blocks: [{ blockType: "hero", content: { title: "Accueil" } }] }
  );
  assert.equal(sealed.sourceValueFingerprint, null);
});

test("internal-link sealing binds the exact persisted source block and source HTML", () => {
  const sourceHtml = "<p>Bienvenue à Gien.</p>";
  const site = {
    agencyId: 4,
    agency: { id: 4, city: "Gien" },
    pages: [
      {
        slug: "home",
        title: "Accueil",
        blocks: [{ id: "copy-home", blockType: "rich_text", content: { html: sourceHtml } }],
      },
      {
        slug: "avis",
        title: "Avis clients",
        blocks: [{ id: "copy-avis", blockType: "rich_text", content: { html: "<p>Vos avis.</p>" } }],
      },
    ],
  };
  const proposal = { pageSlug: "avis", diagnostics: { internalLink: { path: "/agence/gien/avis" } } };
  const operation = sealInternalLinkOperation(
    { type: "add-internal-link", suggestedSourceSlugs: ["home"] },
    proposal,
    site,
    site.pages[1]
  );
  const expectedLabel = internalLinkLabel(site.pages[1], site);

  assert.deepEqual(operation.target, {
    scope: "block",
    pageSlug: "home",
    blockType: "rich_text",
    blockId: "copy-home",
    field: "content.html",
  });
  assert.equal(operation.sourceValueFingerprint, sha256Text(sourceHtml));
  assert.deepEqual(operation.link, { href: "/agence/gien/avis", label: expectedLabel });
  assert.equal(operation.finalValue, `${sourceHtml}<p><a href="/agence/gien/avis">${expectedLabel}</a></p>`);
  assert.match(expectedLabel, /avis|retours/i);
  assert.notEqual(expectedLabel, "Découvrir Avis clients");
});

test("internal-link anchor selection is deterministic for the same agency and page", () => {
  const site = { agencyId: 4, agency: { id: 4, city: "Gien" } };
  const page = { slug: "equipe", title: "Notre équipe" };
  assert.equal(internalLinkLabel(page, site), internalLinkLabel(page, site));
});

test("internal-link sealing remains incomplete without a persisted rich-text block id", () => {
  const site = {
    pages: [
      { slug: "home", title: "Accueil", blocks: [{ blockType: "rich_text", content: { html: "<p>Accueil</p>" } }] },
      { slug: "avis", title: "Avis clients", blocks: [] },
    ],
  };
  const operation = sealInternalLinkOperation(
    { type: "add-internal-link", suggestedSourceSlugs: ["home"] },
    { pageSlug: "avis", diagnostics: { internalLink: { path: "/agence/gien/avis" } } },
    site,
    site.pages[1]
  );

  assert.equal(operation.target, undefined);
  assert.equal(operation.sourceValueFingerprint, undefined);
  assert.equal(operation.finalValue, undefined);
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
