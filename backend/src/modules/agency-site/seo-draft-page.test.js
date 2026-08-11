"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { slugify, buildSeoDraftPageDefinition } = require("./seo-draft-page");

test("slugify creates stable local SEO slugs", () => {
  assert.equal(slugify("Agence de voyages à Bois-Colombes"), "agence-de-voyages-a-bois-colombes");
});

test("SEO page definition is always draft, unpublished and absent from navigation", () => {
  const page = buildSeoDraftPageDefinition({
    keyword: "voyage sur mesure bois colombes",
    proposedH1: "Voyage sur mesure à Bois-Colombes",
    angle: "Présenter l'accompagnement local de l'agence sans inventer d'expertise.",
  });
  assert.equal(page.status, "draft");
  assert.equal(page.published, false);
  assert.equal(page.menu, "none");
  assert.equal(page.pageType, "seo-local");
  assert.equal(page.slug, "voyage-sur-mesure-bois-colombes");
});

test("invalid brief is rejected", () => {
  assert.throws(() => buildSeoDraftPageDefinition({}), /H1 et un slug/);
});
