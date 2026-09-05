"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  pointClass,
  maskForCampaign,
  foundMaskForCampaign,
  buildCalibrationReport,
} = require("../src/modules/ranking-grid/calibration");

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

test("diagnostic mask preserves no-search while found mask ignores absence reason", () => {
  const c = campaign(1, "NNNNN/FFFFN/FFFFN/FFFFN/NNNNN");
  assert.equal(maskForCampaign(c), "NNNNN/FFFFN/FFFFN/FFFFN/NNNNN");
  assert.equal(foundMaskForCampaign(c), "-----/FFFF-/FFFF-/FFFF-/-----");
});

test("network audit warns when found footprint is shared even if no-search masks differ", () => {
  const report = buildCalibrationReport([
    campaign(1, "-----/FFFF-/FFFF-/FFFF-/-----"),
    campaign(2, "----N/FFFFN/FFFF-/FFFF-/-----"),
    campaign(3, "-----/FFFF-/FFFF-/FFFF-/NNNN-"),
    campaign(4, "----N/FFFF-/FFFF-/FFFFN/----N"),
  ]);
  assert.equal(report.mode, "read_only");
  assert.equal(report.providerCalls, 0);
  assert.equal(report.executionTriggered, false);
  assert.equal(report.summary.campaigns, 4);
  assert.equal(report.summary.distinctMasks, 4);
  assert.equal(report.summary.distinctFoundMasks, 1);
  assert.equal(report.summary.dominantFoundMaskCampaigns, 4);
  assert.equal(report.summary.identicalFoundMaskRate, 1);
  assert.equal(report.summary.geometryWarning, true);
  assert.equal(report.summary.dominantFoundMask, "-----/FFFF-/FFFF-/FFFF-/-----");
  assert.equal(report.foundMaskGroups.length, 1);
});
