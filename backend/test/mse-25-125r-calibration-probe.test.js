"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EXPECTED_ACK,
  SENTINEL_CELLS,
  DEFAULT_ZOOMS,
  MAX_CALLS,
  OBSERVED_UNIT_COST_USD,
  parseZooms,
  placeIdFromGoogleReviewUrl,
  dataForSeoBalance,
} = require("../scripts/mse-25-125r-calibration-probe");

test("calibration probe is hard-bounded to 18 calls and $0.036 observed estimate", () => {
  assert.equal(EXPECTED_ACK, "RUN-RANKING-GRID-CALIBRATION-PROBE");
  assert.equal(SENTINEL_CELLS.length, 9);
  assert.deepEqual(DEFAULT_ZOOMS, [14, 16]);
  assert.equal(SENTINEL_CELLS.length * DEFAULT_ZOOMS.length, MAX_CALLS);
  const estimate = MAX_CALLS * OBSERVED_UNIT_COST_USD;
  assert.ok(Math.abs(estimate - 0.036) < 1e-12, `expected ~0.036, got ${estimate}`);
});

test("zoom parser only accepts unique integer Google Maps zoom levels", () => {
  assert.deepEqual(parseZooms("14,16"), [14, 16]);
  assert.throws(() => parseZooms("14,14"), /unique/);
  assert.throws(() => parseZooms("2,16"), /between 3 and 21/);
  assert.throws(() => parseZooms("14.5,16"), /between 3 and 21/);
});

test("review URL place id fallback remains exact", () => {
  assert.equal(
    placeIdFromGoogleReviewUrl("https://search.google.com/local/writereview?placeid=ChIJ-test_123"),
    "ChIJ-test_123",
  );
});

test("balance preflight extracts finite balance without exposing credentials", async () => {
  const calls = [];
  const balance = await dataForSeoBalance({
    login: "user",
    password: "secret",
    fetchImpl: async (url, options) => {
      calls.push({ url, hasAuthorization: Boolean(options?.headers?.Authorization) });
      return {
        ok: true,
        json: async () => ({ tasks: [{ result: [{ money: { balance: 42.5 } }] }] }),
      };
    },
  });
  assert.equal(balance, 42.5);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].hasAuthorization, true);
});
