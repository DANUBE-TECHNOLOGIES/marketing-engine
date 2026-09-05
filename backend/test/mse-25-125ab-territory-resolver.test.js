"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeFeature,
  reverseGeocodeUrl,
  enrichPriorityCells,
} = require("../src/modules/ranking-grid/territory-resolver");

test("IGN feature normalization preserves commune identity", () => {
  const normalized = normalizeFeature({
    properties: {
      label: "10 Rue Exemple 92600 Asnières-sur-Seine",
      name: "10 Rue Exemple",
      postcode: "92600",
      city: "Asnières-sur-Seine",
      citycode: "92004",
      context: "92, Hauts-de-Seine, Île-de-France",
      type: "housenumber",
      distance: 12.5,
    },
  });
  assert.equal(normalized.city, "Asnières-sur-Seine");
  assert.equal(normalized.citycode, "92004");
  assert.equal(normalized.postcode, "92600");
  assert.equal(normalized.distance, 12.5);
});

test("reverse geocoding URL uses official coordinates and one result", () => {
  const url = new URL(reverseGeocodeUrl({
    latitude: 48.895994,
    longitude: 2.301048,
  }));
  assert.equal(url.origin, "https://data.geopf.fr");
  assert.equal(url.pathname, "/geocodage/reverse");
  assert.equal(url.searchParams.get("lat"), "48.895994");
  assert.equal(url.searchParams.get("lon"), "2.301048");
  assert.equal(url.searchParams.get("limit"), "1");
});

test("territory enrichment is bounded and aggregates selected priority cities", async () => {
  const cells = [
    { priority: "p1", rank: 59, latitude: 48.895994, longitude: 2.301048 },
    { priority: "p1", rank: 63, latitude: 48.895994, longitude: 2.287363 },
    { priority: "p2", rank: 45, latitude: 48.904987, longitude: 2.301048 },
    { priority: "p3", rank: 17, latitude: 48.91398, longitude: 2.287363 },
  ];
  const cities = ["Asnières-sur-Seine", "Courbevoie", "Asnières-sur-Seine"];
  let index = 0;
  const result = await enrichPriorityCells(cells, {
    levels: ["p1", "p2"],
    maxCalls: 3,
    reverseGeocode: async () => ({ city: cities[index++] }),
  });
  assert.equal(result.externalCalls, 3);
  assert.equal(result.resolved, 3);
  assert.equal(result.unresolved, 0);
  assert.equal(result.cells.length, 3);
  assert.equal(result.byCity["Asnières-sur-Seine"].cells, 2);
  assert.equal(result.byCity.Courbevoie.cells, 1);
});

test("territory enrichment refuses calls above explicit ceiling", async () => {
  const cells = Array.from({ length: 3 }, (_, index) => ({
    priority: "p1",
    rank: 30 + index,
    latitude: 48.9,
    longitude: 2.3,
  }));
  await assert.rejects(
    enrichPriorityCells(cells, { maxCalls: 2, reverseGeocode: async () => null }),
    (error) => error.code === "RANKING_GRID_TERRITORY_MAX_CALLS_EXCEEDED",
  );
});
