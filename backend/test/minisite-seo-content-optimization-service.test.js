"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { MiniSiteSeoEnrichmentService } = require("../src/modules/minisite-seo-enrichment/service");

function fixture() {
  const saves = [];
  const repository = {
    async findSiteByAgency() {
      return {
        id: 10,
        slug: "gien",
        agencyId: 1,
        agency: { name: "Mondescale Gien", city: "Gien" },
        pages: [{ id: 100, slug: "home", title: "Accueil" }],
      };
    },
  };
  const persistence = {
    async get() {
      return {
        id: 100,
        slug: "",
        title: "Accueil",
        status: "published",
        seoTitle: "Agence de voyages à Gien",
        metaDescription: "Votre agence de voyages à Gien.",
        published: true,
        version: 4,
        blocks: [{ id: 8, type: "hero", status: "published", position: 0, content: { title: "Découvrez votre prochaine destination", subtitle: "" }, settings: {}, seo: {}, visibleDesktop: true, visibleMobile: true, version: 1 }],
      };
    },
    async save(input) {
      saves.push(input);
      return { id: 100, slug: "", version: 5 };
    },
  };
  return { service: new MiniSiteSeoEnrichmentService({ repository, pageBuilderPersistenceService: persistence }), saves };
}

test("MSE-25.30 previews visible content optimization without writing", async () => {
  const { service, saves } = fixture();
  const result = await service.previewAgencyContentOptimization({ agencyId: 1 });
  assert.equal(result.writes, false);
  assert.equal(result.summary.pagesChanged, 1);
  assert.equal(result.pages[0].after[0].content.title, "Agence de voyages à Gien");
  assert.equal(saves.length, 0);
});

test("MSE-25.30 refuses visible content writes without explicit confirmation", async () => {
  const { service } = fixture();
  await assert.rejects(
    () => service.optimizeAgencyContent({ agencyId: 1, dryRun: false, confirm: false }),
    (error) => error.code === "MINISITE_SEO_CONTENT_OPTIMIZATION_CONFIRMATION_REQUIRED"
  );
});

test("MSE-25.30 writes through Designer V2 persistence with a version reason", async () => {
  const { service, saves } = fixture();
  const result = await service.optimizeAgencyContent({ agencyId: 1, dryRun: false, confirm: true, createdBy: "seo-editor" });
  assert.equal(result.versioned, true);
  assert.equal(result.summary.pagesWritten, 1);
  assert.equal(saves.length, 1);
  assert.equal(saves[0].metadata.reason, "mse-25.30-local-content-optimization");
  assert.equal(saves[0].metadata.createdBy, "seo-editor");
  assert.equal(saves[0].body.blocks[0].content.title, "Agence de voyages à Gien");
});
