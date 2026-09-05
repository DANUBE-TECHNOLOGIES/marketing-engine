"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EXPECTED_ACK,
  DEFAULT_CAMPAIGN_ID,
  DEFAULT_ZOOM,
  MAX_CALLS,
  DEFAULT_MAX_COST_USD,
  parseZoom,
} = require("../scripts/mse-25-125s-full-grid-calibration");

const { OBSERVED_UNIT_COST_USD } = require("../scripts/mse-25-125r-calibration-probe");

test("full-grid calibration is bounded to one 5x5 grid at zoom 14", () => {
  assert.equal(EXPECTED_ACK, "RUN-FULL-GRID-RANKING-CALIBRATION");
  assert.equal(DEFAULT_CAMPAIGN_ID, 4);
  assert.equal(DEFAULT_ZOOM, 14);
  assert.equal(MAX_CALLS, 25);
  assert.equal(DEFAULT_MAX_COST_USD, 0.05);
  assert.ok(Math.abs(MAX_CALLS * OBSERVED_UNIT_COST_USD - 0.05) < 1e-12);
});

test("full-grid zoom parser only accepts integer Google Maps zooms", () => {
  assert.equal(parseZoom("14"), 14);
  assert.equal(parseZoom(undefined), 14);
  assert.throws(() => parseZoom("14.5"), /integer Google Maps zoom/);
  assert.throws(() => parseZoom("2"), /between 3 and 21/);
  assert.throws(() => parseZoom("22"), /between 3 and 21/);
});
