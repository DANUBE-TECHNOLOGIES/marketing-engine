"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildContentGraph, getNodeNeighborhood } = require("../src/lib/contentGraph");

const fixture = {
  countries: [{ id: "fr", name: "France", slug: "france", continent: "Europe", status: "published" }],
  regions: [{ id: "corse", countryId: "fr", name: "Corse", slug: "corse", status: "published" }],
  cities: [{ id: "aja", countryId: "fr", regionId: "corse", name: "Ajaccio", slug: "ajaccio", status: "published" }],
  themes: [{ id: "plage", name: "Plage", slug: "plage", status: "published" }],
  travelTypes: [{ id: "sejour", name: "Séjour", slug: "sejour", status: "published" }],
  tags: [{ id: "famille", name: "Famille", slug: "famille", status: "active" }],
  destinations: [{ id: "d1", name: "Ajaccio", slug: "ajaccio", countryId: "fr", regionId: "corse", cityId: "aja", status: "published", themes: [{ themeId: "plage", weight: 90 }], travelTypes: [{ travelTypeId: "sejour", weight: 100 }], tags: [{ tagId: "famille" }] }],
  pages: [{ id: "p1", siteId: "s1", title: "Voyage à Ajaccio", slug: "ajaccio", path: "/ajaccio", pageType: "destination", status: "published", published: true }],
};

test("builds a typed graph with hierarchy, taxonomy and page links", () => {
  const graph = buildContentGraph(fixture);
  assert.equal(graph.summary.nodes, 9);
  assert.equal(graph.summary.byType.destination, 1);
  assert.ok(graph.edges.some((e) => e.source === "region:corse" && e.target === "city:aja" && e.relation === "contains"));
  assert.ok(graph.edges.some((e) => e.source === "destination:d1" && e.target === "theme:plage" && e.relation === "has-theme"));
  assert.ok(graph.edges.some((e) => e.source === "page:p1" && e.target === "destination:d1" && e.relation === "represents"));
});

test("deduplicates continent nodes", () => {
  const graph = buildContentGraph({ countries: [fixture.countries[0], { id: "es", name: "Espagne", slug: "espagne", continent: "Europe" }] });
  assert.equal(graph.nodes.filter((node) => node.type === "continent").length, 1);
});

test("returns a bounded neighborhood", () => {
  const graph = buildContentGraph(fixture);
  const neighborhood = getNodeNeighborhood(graph, "destination:d1", 1);
  assert.equal(neighborhood.root.title, "Ajaccio");
  assert.ok(neighborhood.nodes.some((node) => node.graphId === "theme:plage"));
  assert.ok(!neighborhood.nodes.some((node) => node.graphId === "continent:europe"));
});
