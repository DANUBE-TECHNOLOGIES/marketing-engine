"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { slugify, validateTaxonomyPayload, buildTaxonomyTree, summarizeTaxonomy } = require("../src/lib/taxonomyEngine");

test("slugify normalise les accents et séparateurs", () => {
  assert.equal(slugify("Île-de-France & Paris"), "ile-de-france-paris");
});

test("validateTaxonomyPayload accepte une hiérarchie complète", () => {
  const report = validateTaxonomyPayload({ continents: [{ name: "Europe", countries: [{ name: "Hongrie", iso2: "HU", regions: [{ name: "Hongrie centrale", cities: [{ name: "Budapest", destinations: [{ name: "Budapest", status: "published" }] }] }] }] }] });
  assert.equal(report.ok, true);
  assert.deepEqual(report.counts, { continent: 1, country: 1, region: 1, city: 1, destination: 1 });
  assert.equal(report.taxonomy.continents[0].countries[0].regions[0].cities[0].destinations[0].slug, "budapest");
});

test("validateTaxonomyPayload rejette les slugs dupliqués et ISO invalides", () => {
  const report = validateTaxonomyPayload({ continents: [{ name: "Europe", countries: [{ name: "France", iso2: "F" }, { name: "France", iso2: "FR" }] }] });
  assert.equal(report.ok, false);
  assert.ok(report.errors.some((error) => error.code === "DUPLICATE_SLUG"));
  assert.ok(report.errors.some((error) => error.code === "INVALID_ISO2"));
});

test("buildTaxonomyTree rattache régions, villes et destinations", () => {
  const data = {
    countries: [{ id: "co1", name: "Hongrie", slug: "hongrie", continent: "Europe", status: "published" }],
    regions: [{ id: "r1", countryId: "co1", name: "Centre", slug: "centre", status: "published" }],
    cities: [{ id: "ci1", countryId: "co1", regionId: "r1", name: "Budapest", slug: "budapest", status: "published" }],
    destinations: [{ id: "d1", countryId: "co1", regionId: "r1", cityId: "ci1", name: "Budapest", slug: "budapest", status: "published" }],
  };
  const tree = buildTaxonomyTree(data);
  assert.equal(tree[0].slug, "europe");
  assert.equal(tree[0].countries[0].regions[0].cities[0].destinations[0].slug, "budapest");
});

test("summarizeTaxonomy calcule la couverture", () => {
  const summary = summarizeTaxonomy({ countries: [{ continent: "Europe" }], regions: [], cities: [], destinations: [{ countryId: "co1" }, {}] });
  assert.equal(summary.linkedDestinations, 1);
  assert.equal(summary.unlinkedDestinations, 1);
  assert.equal(summary.coveragePercent, 50);
});
