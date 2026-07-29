"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeText, fuzzySimilarity, expandQuery } = require("../src/modules/search-engine/normalization");
const { scoreDocument } = require("../src/modules/search-engine/scoring");
const { buildFacets, matchesFilter } = require("../src/modules/search-engine/service");

const budapest = {
  entityType: "destination", name: "Budapest", slug: "budapest", country: "Hongrie",
  region: "Europe centrale", status: "published", themes: ["City break", "Culture"],
  themeSlugs: ["city-break", "culture"], travelTypeSlugs: ["week-end"], tagSlugs: ["danube"],
  summary: "Capitale traversée par le Danube", published: true,
};

test("normalise accents et ponctuation", () => {
  assert.equal(normalizeText("États-Unis d’Amérique"), "etats unis d amerique");
});

test("développe les alias connus", () => {
  assert.ok(expandQuery("NYC").includes("new york"));
});

test("tolère une faute simple", () => {
  assert.ok(fuzzySimilarity("budapset", "budapest") > 0.7);
});

test("classe une correspondance exacte au-dessus d'une correspondance secondaire", () => {
  const exact = scoreDocument(budapest, "Budapest").score;
  const secondary = scoreDocument(budapest, "Danube").score;
  assert.ok(exact > secondary);
});

test("applique les filtres", () => {
  assert.equal(matchesFilter(budapest, { entityTypes: ["destination"], status: "published", country: "Hongrie", region: null, site: null, pageType: null, theme: "culture", travelType: null, tag: null }), true);
  assert.equal(matchesFilter(budapest, { entityTypes: ["page"], status: null, country: null, region: null, site: null, pageType: null, theme: null, travelType: null, tag: null }), false);
});

test("construit les facettes avec comptage", () => {
  const facets = buildFacets([budapest, { ...budapest, id: "2", name: "Pécs", slug: "pecs", status: "draft" }]);
  assert.deepEqual(facets.country[0], { value: "Hongrie", count: 2 });
  assert.equal(facets.status.length, 2);
});
