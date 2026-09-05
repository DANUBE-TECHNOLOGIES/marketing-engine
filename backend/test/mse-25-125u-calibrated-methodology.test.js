"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_ZOOM,
  DEFAULT_DEPTH,
  DEFAULT_SEARCH_PLACES,
  DEFAULT_SEARCH_THIS_AREA,
  METHODOLOGY_VERSION,
  DataForSeoMapsRankingGridProvider,
  extractResult,
} = require("../src/modules/ranking-grid/dataforseo-provider");
const {
  compareCampaigns,
  campaignMethodology,
  sameMethodology,
} = require("../src/modules/ranking-grid/comparison");

const method = {
  version: METHODOLOGY_VERSION,
  zoom: DEFAULT_ZOOM,
  depth: DEFAULT_DEPTH,
  searchPlaces: DEFAULT_SEARCH_PLACES,
  searchThisArea: DEFAULT_SEARCH_THIS_AREA,
};

function campaign({ id, methodology = method, position = 2 }) {
  return {
    id,
    agencyId: 6,
    keywordId: 2,
    keyword: "agence de voyage",
    city: "Bois-Colombes",
    gridSize: 1,
    spacingKm: 1,
    centerLat: 48.91398,
    centerLng: 2.273679,
    summary: { presenceRate: 1, top3Rate: 1, averagePosition: position, foundPoints: 1 },
    points: [{
      row: 0,
      col: 0,
      status: "success",
      found: true,
      position,
      providerMetadata: methodology == null ? { provider: "dataforseo-google-maps-live" } : {
        provider: "dataforseo-google-maps-live",
        methodology,
      },
    }],
  };
}

test("production DataForSEO methodology defaults to calibrated zoom 14", () => {
  const provider = new DataForSeoMapsRankingGridProvider({
    login: "test",
    password: "test",
    fetchImpl: async () => { throw new Error("must not fetch"); },
    targetResolver: async () => ({ name: "test" }),
  });
  assert.equal(DEFAULT_ZOOM, 14);
  assert.deepEqual(provider.methodology, method);
});

test("provider results persist complete methodology metadata", () => {
  const payload = {
    status_code: 20000,
    tasks: [{
      status_code: 20000,
      cost: 0.002,
      result: [{
        items_count: 1,
        items: [{ type: "maps_search", title: "Agency", rank_group: 3, rank_absolute: 3 }],
      }],
    }],
  };
  const result = extractResult(payload, { name: "Agency" });
  assert.equal(result.found, true);
  assert.deepEqual(result.providerMetadata.methodology, method);
});

test("same calibrated methodology remains comparable", () => {
  const from = campaign({ id: 10, position: 5 });
  const to = campaign({ id: 11, position: 2 });
  assert.equal(sameMethodology(from, to), true);
  assert.deepEqual(campaignMethodology(from), method);
  const comparison = compareCampaigns(from, to);
  assert.deepEqual(comparison.methodology, method);
  assert.equal(comparison.movement.improved, 1);
});

test("legacy campaigns without methodology cannot be silently compared with calibrated campaigns", () => {
  const legacy = campaign({ id: 1, methodology: null, position: 2 });
  const calibrated = campaign({ id: 10, position: 2 });
  assert.equal(campaignMethodology(legacy), null);
  assert.equal(sameMethodology(legacy, calibrated), false);
  assert.throws(
    () => compareCampaigns(legacy, calibrated),
    (error) => error?.code === "RANKING_GRID_COMPARISON_METHODOLOGY_MISMATCH",
  );
});

test("different zooms cannot be silently compared", () => {
  const z14 = campaign({ id: 10 });
  const z15 = campaign({ id: 11, methodology: { ...method, zoom: 15 } });
  assert.equal(sameMethodology(z14, z15), false);
  assert.throws(
    () => compareCampaigns(z14, z15),
    (error) => error?.code === "RANKING_GRID_COMPARISON_METHODOLOGY_MISMATCH",
  );
});
