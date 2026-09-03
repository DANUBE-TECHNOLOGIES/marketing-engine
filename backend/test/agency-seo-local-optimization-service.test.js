"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const AgencySeoService = require("../src/modules/agency-seo/service");

function repository() {
  const page = { id: "page-1", slug: "accueil", pageType: "home", title: "Accueil", seoTitle: null, seoDescription: null, introduction: null, localCity: null, content: { existing: "kept" }, site: { name: "Mondescale Gien", seoCity: "Gien", agency: { name: "Mondescale Gien", city: "Gien" } } };
  return {
    getPageById: async () => page,
    updatePage: async (id, data) => ({ ...page, ...data, id }),
  };
}

test("MSE-25.30 preview does not mutate the page", async () => {
  const service = new AgencySeoService(repository());
  const result = await service.previewLocalOptimization("page-1");
  assert.equal(result.current.seoTitle, null);
  assert.match(result.proposal.seoTitle, /Agence de voyages à Gien/);
  assert.equal(result.proposal.optimization.autoPublish, false);
});

test("MSE-25.30 refuses application without explicit review", async () => {
  const service = new AgencySeoService(repository());
  await assert.rejects(() => service.applyLocalOptimization("page-1", { reviewed: false }), /relue avant application/i);
});

test("MSE-25.30 applies reviewed SEO while preserving existing content", async () => {
  const service = new AgencySeoService(repository());
  const result = await service.applyLocalOptimization("page-1", { reviewed: true });
  assert.match(result.page.seoTitle, /Agence de voyages à Gien/);
  assert.equal(result.page.content.existing, "kept");
  assert.match(result.page.content.h1, /agence de voyages à Gien/i);
});
