"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  directionFor,
  rankBand,
  priorityScore,
  priorityLevel,
  analyzeGeoPriorities,
} = require("../src/modules/ranking-grid/geo-priority");

function point(row, col, northKm, eastKm, position) {
  return {
    row,
    col,
    latitude: 48.9 + northKm / 111,
    longitude: 2.27 + eastKm / 73,
    northKm,
    eastKm,
    status: "success",
    found: true,
    position,
  };
}

function campaign(positions) {
  const points = [];
  let index = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      points.push(point(row, col, 2 - row, col - 2, positions[index++]));
    }
  }
  return {
    id: 11,
    agencyId: 6,
    city: "Bois-Colombes",
    centerLat: 48.91398,
    centerLng: 2.273679,
    points,
  };
}

test("priority helpers preserve ranking bands and directions", () => {
  assert.equal(directionFor({ northKm: -2, eastKm: 1 }), "south");
  assert.equal(directionFor({ northKm: 0, eastKm: 2 }), "east");
  assert.equal(rankBand(2), "top3");
  assert.equal(rankBand(8), "top10");
  assert.equal(rankBand(15), "top20");
  assert.equal(rankBand(31), "beyond20");
  assert.equal(priorityLevel(priorityScore({ found: true, position: 2, northKm: 0, eastKm: 0 })), "monitor");
});

test("Bois-Colombes priorities surface south and east weak cells", () => {
  const result = analyzeGeoPriorities(campaign([
    17,15,14,12,17,
    15,12,8,15,20,
    15,7,2,17,31,
    18,16,13,20,45,
    22,23,34,63,59,
  ]));

  assert.equal(result.campaignId, 11);
  assert.equal(result.summary.cells, 25);
  assert.ok(result.summary.actionableCells > 0);
  assert.ok(result.summary.p1 >= 2);

  // Priority is intentionally score-based, not raw-rank-only: the rank-59
  // cell is farther from the agency than rank 63 and therefore scores higher.
  assert.equal(result.priorityCells[0].rank, 59);
  assert.equal(result.priorityCells[0].direction, "south");
  assert.ok(result.priorityCells[0].score > result.priorityCells[1].score);
  assert.deepEqual(
    new Set(result.priorityCells.slice(0, 2).map((cell) => cell.rank)),
    new Set([59, 63]),
  );

  assert.ok(["south", "east"].includes(result.summary.dominantPriorityDirection));
  assert.ok(result.byDirection.south.averageRank > result.byDirection.north.averageRank);
});

test("strong grid remains largely monitor-only", () => {
  const result = analyzeGeoPriorities(campaign(Array(25).fill(1)));
  assert.equal(result.summary.p1, 0);
  assert.equal(result.summary.p2, 0);
  assert.equal(result.summary.p3, 0);
  assert.equal(result.summary.actionableCells, 0);
  assert.equal(result.summary.monitor, 25);
});
