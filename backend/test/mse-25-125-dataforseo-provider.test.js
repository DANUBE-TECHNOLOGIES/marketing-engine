"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DataForSeoMapsRankingGridProvider,
  selectAgencyItem,
  extractResult,
} = require("../src/modules/ranking-grid/dataforseo-provider");

test("selectAgencyItem prefers exact place id over a similar business name", () => {
  const items = [
    { type: "maps_search", rank_group: 1, title: "Mondescale Voyages", place_id: "wrong" },
    { type: "maps_search", rank_group: 7, title: "Mondescale Voyages Bois-Colombes", place_id: "expected" },
  ];
  const selected = selectAgencyItem(items, { name: "Mondescale Voyages", placeId: "expected" });
  assert.equal(selected.place_id, "expected");
  assert.equal(selected.rank_group, 7);
});

test("extractResult returns Maps rank, reviews, rating and cost", () => {
  const result = extractResult({
    status_code: 20000,
    cost: 0.002,
    tasks: [{
      status_code: 20000,
      cost: 0.002,
      result: [{
        items_count: 1,
        items: [{
          type: "maps_search",
          rank_group: 4,
          rank_absolute: 4,
          title: "Mondescale Voyages Bois-Colombes",
          place_id: "abc",
          cid: "123",
          rating: { value: 4.7, votes_count: 18 },
          latitude: 48.917,
          longitude: 2.268,
        }],
      }],
    }],
  }, { placeId: "abc", name: "Mondescale Voyages Bois-Colombes" });

  assert.equal(result.found, true);
  assert.equal(result.position, 4);
  assert.equal(result.absolutePosition, 4);
  assert.equal(result.rating, 4.7);
  assert.equal(result.reviews, 18);
  assert.equal(result.cost, 0.002);
});

test("provider sends exact coordinates and disables search_places", async () => {
  let captured;
  const provider = new DataForSeoMapsRankingGridProvider({
    login: "login",
    password: "password",
    zoom: 16,
    targetResolver: async () => ({ name: "Mondescale Voyages Bois-Colombes", placeId: "abc" }),
    fetchImpl: async (_url, options) => {
      captured = JSON.parse(options.body)[0];
      return {
        ok: true,
        json: async () => ({
          status_code: 20000,
          tasks: [{ status_code: 20000, cost: 0.001, result: [{ items_count: 0, items: [] }] }],
        }),
      };
    },
  });

  const result = await provider.measurePoint({
    agencyId: 1,
    keyword: "agence de voyage",
    latitude: 48.917123456,
    longitude: 2.268987654,
  });

  assert.equal(captured.location_coordinate, "48.9171235,2.2689877,16z");
  assert.equal(captured.language_code, "fr");
  assert.equal(captured.search_places, false);
  assert.equal(captured.search_this_area, true);
  assert.equal(result.found, false);
});

test("provider never performs a request without credentials", async () => {
  let called = false;
  const provider = new DataForSeoMapsRankingGridProvider({
    login: "",
    password: "",
    targetResolver: async () => ({ name: "x" }),
    fetchImpl: async () => { called = true; },
  });

  await assert.rejects(
    provider.measurePoint({ agencyId: 1, keyword: "agence de voyage", latitude: 1, longitude: 2 }),
    (error) => error.code === "DATAFORSEO_CREDENTIALS_MISSING"
  );
  assert.equal(called, false);
});
