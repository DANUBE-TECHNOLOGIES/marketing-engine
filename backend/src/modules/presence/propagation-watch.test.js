"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { classifyPropagationAge } = require("./propagation-watch");

const now = new Date("2026-08-24T12:00:00.000Z");

test("recent provider propagation is normal", () => {
  const result = classifyPropagationAge(new Date("2026-08-24T10:00:00.000Z"), now);
  assert.equal(result.state, "normal");
});

test("provider propagation becomes slow after warning threshold", () => {
  const result = classifyPropagationAge(new Date("2026-08-24T05:00:00.000Z"), now);
  assert.equal(result.state, "slow");
});

test("provider propagation becomes stale after stale threshold", () => {
  const result = classifyPropagationAge(new Date("2026-08-23T10:00:00.000Z"), now);
  assert.equal(result.state, "stale");
});