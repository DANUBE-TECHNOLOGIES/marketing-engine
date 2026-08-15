"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { applyOptimizedSeoItems } = require("../src/modules/minisite-seo-enrichment/optimizer-executor");

function fakeRepository() {
  const updates = [];
  const page = { id: "page-1", seoTitle: "Accueil", metaDescription: "Bienvenue." };
  const client = {
    agencySitePage: {
      findUnique: async () => ({ ...page }),
      update: async ({ where, data }) => { updates.push({ where, data }); Object.assign(page, data); return { ...page }; },
    },
  };
  return {
    updates,
    prisma: {
      ...client,
      $transaction: async (callback) => callback(client),
    },
  };
}

const items = [{
  pageId: "page-1",
  slug: "",
  generated: {
    seoTitle: "Agence de voyages à Gien | Mondescale Gien",
    metaDescription: "Mondescale Gien à Gien vous conseille pour vos séjours, circuits, croisières et voyages sur mesure.",
  },
  actions: { setSeoTitle: true, setMetaDescription: true },
}];

test("MSE-25.30 dry-run exposes the before/after diff without modifying AgencySitePage", async () => {
  const repository = fakeRepository();
  const result = await applyOptimizedSeoItems(repository, { items, dryRun: true });
  assert.equal(repository.updates.length, 0);
  assert.equal(result.summary.pagesChanged, 1);
  assert.equal(result.items[0].previous.seoTitle, "Accueil");
  assert.match(result.items[0].next.seoTitle, /Agence de voyages à Gien/);
});

test("MSE-25.30 confirmed execution persists optimized metadata on AgencySitePage", async () => {
  const repository = fakeRepository();
  const result = await applyOptimizedSeoItems(repository, { items, dryRun: false });
  assert.equal(repository.updates.length, 1);
  assert.equal(result.summary.seoTitlesOptimized, 1);
  assert.equal(result.summary.metaDescriptionsOptimized, 1);
  assert.match(repository.updates[0].data.seoTitle, /Agence de voyages à Gien/);
});
