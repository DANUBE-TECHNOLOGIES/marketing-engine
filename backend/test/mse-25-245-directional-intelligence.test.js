"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  direction8,
  quadrant,
  analyzeDirectionalIntelligence,
} = require("../src/modules/ranking-grid/directional-intelligence");

const matrix = [
  [17, 15, 14, 12, 17],
  [15, 12, 8, 15, 20],
  [15, 7, 2, 17, 31],
  [18, 16, 13, 20, 45],
  [22, 23, 34, 63, 59],
];

function boisColombesCampaign() {
  const points = [];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      points.push({
        row,
        col,
        northKm: 2 - row,
        eastKm: col - 2,
        found: true,
        status: "success",
        position: matrix[row][col],
      });
    }
  }

  return {
    id: 11,
    agencyId: 6,
    agencyName: "Ambassade FRAM Mondescale Bois-Colombes",
    city: "Bois-Colombes",
    keyword: "agence de voyage",
    gridSize: 5,
    spacingKm: 1,
    points,
  };
}

test("MSE-25.245 classifies 8 directional sectors", () => {
  assert.equal(direction8({ northKm: 1, eastKm: 0 }), "north");
  assert.equal(direction8({ northKm: 1, eastKm: 1 }), "north_east");
  assert.equal(direction8({ northKm: 0, eastKm: 1 }), "east");
  assert.equal(direction8({ northKm: -1, eastKm: 1 }), "south_east");
  assert.equal(direction8({ northKm: -1, eastKm: 0 }), "south");
  assert.equal(direction8({ northKm: -1, eastKm: -1 }), "south_west");
  assert.equal(direction8({ northKm: 0, eastKm: -1 }), "west");
  assert.equal(direction8({ northKm: 1, eastKm: -1 }), "north_west");
});

test("MSE-25.245 classifies quadrants from persisted offsets", () => {
  assert.equal(quadrant({ northKm: 1, eastKm: 1 }), "north_east");
  assert.equal(quadrant({ northKm: -1, eastKm: 1 }), "south_east");
  assert.equal(quadrant({ northKm: -1, eastKm: -1 }), "south_west");
  assert.equal(quadrant({ northKm: 1, eastKm: -1 }), "north_west");
});

test("MSE-25.245 detects Bois-Colombes directional collapse", () => {
  const result = analyzeDirectionalIntelligence(
    boisColombesCampaign()
  );

  assert.equal(result.campaignId, 11);
  assert.equal(result.center.rank, 2);

  assert.equal(
    result.profile.code,
    "strong_center_directional_collapse"
  );

  assert.equal(
    result.asymmetry.worstQuadrant.name,
    "south_east"
  );

  assert.ok(result.decay.peripheralMinusCenter > 10);

  assert.ok(
    result.recommendations.some(
      (item) => item.code === "local_authority_expansion"
    )
  );

  assert.ok(
    result.recommendations.some(
      (item) => item.code === "reviews_velocity"
    )
  );

  assert.equal(result.weakestCells[0].rank, 63);
});

test("MSE-25.245 remains deterministic and read-only", () => {
  const first = analyzeDirectionalIntelligence(
    boisColombesCampaign()
  );

  const second = analyzeDirectionalIntelligence(
    boisColombesCampaign()
  );

  assert.deepEqual(first, second);
});
