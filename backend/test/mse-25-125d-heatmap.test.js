"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { optionalNumber } = require("../src/modules/ranking-grid/repository");
const { nullableRank, bandForRank, buildHeatmap } = require("../src/modules/ranking-grid/heatmap");

test("optionalNumber preserves missing values as null", () => {
  assert.equal(optionalNumber(null), null);
  assert.equal(optionalNumber(undefined), null);
  assert.equal(optionalNumber(""), null);
  assert.equal(optionalNumber("7"), 7);
  assert.equal(optionalNumber(0), 0);
  assert.equal(optionalNumber("not-a-number"), null);
});

test("nullableRank never exposes zero for a not-found point", () => {
  assert.equal(nullableRank({ found: false, position: 0 }), null);
  assert.equal(nullableRank({ found: false, position: 12 }), null);
  assert.equal(nullableRank({ found: true, position: null }), null);
  assert.equal(nullableRank({ found: true, position: 0 }), null);
  assert.equal(nullableRank({ found: true, position: 2 }), 2);
});

test("rank bands are stable for heatmap rendering", () => {
  assert.equal(bandForRank(null), "not_found");
  assert.equal(bandForRank(1), "top3");
  assert.equal(bandForRank(3), "top3");
  assert.equal(bandForRank(4), "top10");
  assert.equal(bandForRank(10), "top10");
  assert.equal(bandForRank(11), "top20");
  assert.equal(bandForRank(20), "top20");
  assert.equal(bandForRank(21), "beyond20");
});

test("buildHeatmap returns deterministic row-major 5x5 cells", () => {
  const points = [];
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      points.push({
        id: row * 5 + col + 1,
        row,
        col,
        latitude: 48.9 + row / 100,
        longitude: 2.2 + col / 100,
        northKm: 2 - row,
        eastKm: col - 2,
        status: "success",
        found: false,
        position: 0,
        absolutePosition: 0,
        checkedAt: new Date("2026-09-04T17:47:24Z"),
      });
    }
  }
  points[12] = {
    ...points[12],
    found: true,
    position: 2,
    absolutePosition: 2,
    title: "Ambassade FRAM Mondescale Bois-Colombes",
    rating: 4.7,
    reviews: 18,
  };

  const heatmap = buildHeatmap({
    id: 1,
    agencyId: 6,
    keywordId: 2,
    keyword: "agence de voyage",
    city: "Bois-Colombes",
    status: "completed",
    provider: "dataforseo-google-maps-live",
    gridSize: 5,
    spacingKm: 1,
    centerLat: 48.91398,
    centerLng: 2.273679,
    summary: { totalPoints: 25, foundPoints: 1 },
    points,
  });

  assert.equal(heatmap.rows.length, 5);
  assert.equal(heatmap.rows.every((row) => row.length === 5), true);
  assert.equal(heatmap.rows[0][0].rank, null);
  assert.equal(heatmap.rows[0][0].band, "not_found");
  assert.equal(heatmap.rows[2][2].rank, 2);
  assert.equal(heatmap.rows[2][2].band, "top3");
  assert.equal(heatmap.rows[2][2].title, "Ambassade FRAM Mondescale Bois-Colombes");
  assert.deepEqual(heatmap.center, { latitude: 48.91398, longitude: 2.273679 });
});
