"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pointDistanceKm,
  pointRing,
  pointDirection,
  analyzeSpatialCampaign,
  buildSpatialReport,
} = require("../src/modules/ranking-grid/spatial-analysis");

function point(row, col, northKm, eastKm, position) {
  return {
    row,
    col,
    northKm,
    eastKm,
    status: "success",
    found: true,
    position,
  };
}

function campaign(id, city, positions) {
  const points = [];
  let index = 0;
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      points.push(point(row, col, 2 - row, col - 2, positions[index++]));
    }
  }
  return {
    id,
    agencyId: id,
    keywordId: id,
    keyword: "agence de voyage",
    city,
    status: "completed",
    gridSize: 5,
    spacingKm: 1,
    points,
  };
}

test("spatial helpers classify distance rings and directions", () => {
  assert.equal(pointDistanceKm({ northKm: 1, eastKm: 1 }), Math.sqrt(2));
  assert.equal(pointRing({ northKm: 0, eastKm: 0 }), "center");
  assert.equal(pointRing({ northKm: 1, eastKm: 1 }), "inner");
  assert.equal(pointRing({ northKm: 2, eastKm: 2 }), "outer");
  assert.equal(pointDirection({ northKm: 2, eastKm: 1 }), "north");
  assert.equal(pointDirection({ northKm: -2, eastKm: 1 }), "south");
  assert.equal(pointDirection({ northKm: 1, eastKm: 2 }), "east");
  assert.equal(pointDirection({ northKm: 1, eastKm: -2 }), "west");
});

test("strong campaign exposes stable radial performance", () => {
  const c = campaign(13, "Gien", Array(25).fill(1));
  const result = analyzeSpatialCampaign(c);
  assert.equal(result.overall.averagePosition, 1);
  assert.equal(result.overall.top3Rate, 1);
  assert.equal(result.decay.centerRank, 1);
  assert.equal(result.decay.outerMinusCenter, 0);
  assert.equal(result.severity, "strong");
});

test("weak campaign exposes distance decay and weakest cells", () => {
  const positions = [
    17,15,14,12,17,
    15,10,8,15,20,
    15,7,2,18,31,
    19,16,13,20,46,
    22,22,34,63,59,
  ];
  const result = analyzeSpatialCampaign(campaign(11, "Bois-Colombes", positions));
  assert.equal(result.overall.averagePosition, 21.2);
  assert.equal(result.overall.top3Rate, 0.04);
  assert.equal(result.overall.top10Rate, 0.12);
  assert.equal(result.decay.centerRank, 2);
  assert.ok(result.decay.outerMinusCenter > 20);
  assert.equal(result.weakestCells[0].rank, 63);
  assert.equal(result.severity, "critical");
});

test("network report isolates a critical outlier", () => {
  const strong = campaign(13, "Gien", Array(25).fill(1));
  const weak = campaign(11, "Bois-Colombes", [
    17,15,14,12,17,
    15,10,8,15,20,
    15,7,2,18,31,
    19,16,13,20,46,
    22,22,34,63,59,
  ]);
  const report = buildSpatialReport([weak, strong]);
  assert.equal(report.mode, "read_only");
  assert.equal(report.providerCalls, 0);
  assert.equal(report.executionTriggered, false);
  assert.equal(report.summary.strong, 1);
  assert.equal(report.summary.critical, 1);
  assert.equal(report.summary.bestCampaignId, 13);
  assert.equal(report.summary.worstCampaignId, 11);
  assert.equal(report.summary.worstCity, "Bois-Colombes");
});
