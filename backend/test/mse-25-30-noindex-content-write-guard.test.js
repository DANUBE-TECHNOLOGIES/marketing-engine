"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MiniSiteSeoEnrichmentService,
  isNoindexContentPage,
} = require("../src/modules/minisite-seo-enrichment/service");

const LEGAL_SLUGS = [
  "mentions-legales",
  "mentions_legales",
  "confidentialite",
  "politique-de-confidentialite",
  "privacy",
];

test("MSE-25.30 reconnait toutes les pages canoniques noindex du sitemap", () => {
  for (const slug of LEGAL_SLUGS) {
    assert.equal(isNoindexContentPage({ slug }), true, slug);
  }

  for (const slug of ["home", "circuits", "contact", "croisieres"]) {
    assert.equal(isNoindexContentPage({ slug }), false, slug);
  }
});

test("MSE-25.30 ne charge jamais les pages legales V2 mais conserve les drafts editables", async () => {
  const calls = [];
  const site = {
    id: 10,
    slug: "gien",
    agencyId: 1,
    agency: {
      id: 1,
      name: "Mondescale Gien",
      city: "Gien",
    },
    pages: [
      { id: 100, slug: "home", title: "Accueil", status: "published", published: true },
      { id: 101, slug: "circuits", title: "Circuits", status: "draft", published: false },
      { id: 102, slug: "mentions-legales", title: "Mentions légales", status: "published", published: true },
      { id: 103, slug: "confidentialite", title: "Confidentialité", status: "published", published: true },
    ],
  };

  const persisted = {
    home: {
      id: 100,
      slug: "home",
      title: "Accueil",
      status: "published",
      published: true,
      blocks: [{ id: 1, blockType: "hero", content: { title: "Ancien titre", subtitle: "Introduction manuelle" } }],
    },
    circuits: {
      id: 101,
      slug: "circuits",
      title: "Circuits",
      status: "draft",
      published: false,
      blocks: [{ id: 2, blockType: "hero", content: { title: "Circuits" } }],
    },
  };

  const service = new MiniSiteSeoEnrichmentService({
    repository: {
      findSiteByAgency: async (agencyId) => {
        assert.equal(agencyId, 1);
        return site;
      },
    },
    pageBuilderPersistenceService: {
      get: async ({ agencyId, pageSlug }) => {
        calls.push({ agencyId, pageSlug });
        if (!persisted[pageSlug]) {
          throw new Error(`Lecture V2 inattendue : ${pageSlug}`);
        }
        return persisted[pageSlug];
      },
    },
  });

  const plan = await service.buildAgencyContentOptimization({ agencyId: 1 });

  assert.deepEqual(calls, [
    { agencyId: 1, pageSlug: "home" },
    { agencyId: 1, pageSlug: "circuits" },
  ]);
  assert.deepEqual(plan.pages.map((page) => page.slug), ["home", "circuits"]);
  assert.equal(plan.summary.pagesProcessed, 2);
  assert.equal(plan.summary.pagesExcludedNoindex, 2);

  const draft = plan.pages.find((page) => page.slug === "circuits");
  assert.ok(draft);
  assert.equal(draft.published, false);
  assert.equal(draft.changed, true);
  assert.equal(
    draft.changes.some((change) => change.blockType === "hero" && change.field === "title" && change.next === "Circuits à Gien"),
    true
  );
});

test("MSE-25.30 expose la protection noindex dans son contrat de sante", () => {
  const service = new MiniSiteSeoEnrichmentService({
    repository: {},
    pageBuilderPersistenceService: {},
  });

  assert.equal(service.health().noindexContentWriteGuard, true);
});
