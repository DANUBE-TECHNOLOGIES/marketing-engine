"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { pointClass, maskForCampaign, buildCalibrationReport } = require("../src/modules/ranking-grid/calibration");

function campaign(id, mask) {
  const rows = mask.split("/");
  const points = [];
  rows.forEach((line, row) => [...line].forEach((char, col) => {
    points.push({
      row, col, status: "success",
      found: char === "F",
      position: char === "F" ? 1 : null,
      providerMetadata: char === "N" ? { noSearchResults: true } : {},
    });
  }));
  return { id, agencyId: id, city: `City ${id}`, keyword: "agence de voyage", status: "completed", gridSize: 5, spacingKm: 1, provider: "dataforseo-google-maps-live", points, summary: { presenceRate: 0.48 } };
}

test("calibration classifies found, no-search and ordinary not-found points", () => {
  assert.equal(pointClass({ status: "success", found: true, position: 2 }), "found");
  assert.equal(pointClass({ status: "success", found: false, providerMetadata: { noSearchResults: true } }), "no_search");
  assert.equal(pointClass({ status: "success", found: false, providerMetadata: {} }), "not_found");
  assert.equal(pointClass({ status: "error" }), "error");
});

test("mask preserves the spatial footprint and no-search distinction", () => {
  const c = campaign(1, "NNNNN/FFFFN/FFFFN/FFFFN/NNNNN");
  assert.equal(maskForCampaign(c), "NNNNN/FFFFN/FFFFN/FFFFN/NNNNN");
});

test("network audit warns when at least 75 percent share the same footprint", () => {
  const dominant = "NNNNN/FFFFN/FFFFN/FFFFN/NNNNN";
  const report = buildCalibrationReport([
    campaign(1, dominant), campaign(2, dominant), campaign(3, dominant), campaign(4, "NNNNN/FFFFN/FFFFN/FFFNN/NNNNN"),
  ]);
  assert.equal(report.mode, "read_only");
  assert.equal(report.providerCalls, 0);
  assert.equal(report.executionTriggered, false);
  assert.equal(report.summary.campaigns, 4);
  assert.equal(report.summary.dominantMaskCampaigns, 3);
  assert.equal(report.summary.identicalMaskRate, 0.75);
  assert.equal(report.summary.geometryWarning, true);
});
