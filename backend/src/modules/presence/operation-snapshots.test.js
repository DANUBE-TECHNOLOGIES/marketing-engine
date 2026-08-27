"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { calculatePropagationMs } = require("./operation-snapshots");

test("propagation duration measures elapsed provider convergence time", () => {
  const submittedAt = new Date("2026-08-24T10:00:00.000Z");
  const observedAt = new Date("2026-08-24T10:07:30.000Z");
  assert.equal(calculatePropagationMs(submittedAt, observedAt), 450000);
});

test("propagation duration is null without a submission timestamp", () => {
  assert.equal(calculatePropagationMs(null, new Date()), null);
});

test("propagation duration never becomes negative", () => {
  const submittedAt = new Date("2026-08-24T10:10:00.000Z");
  const observedAt = new Date("2026-08-24T10:05:00.000Z");
  assert.equal(calculatePropagationMs(submittedAt, observedAt), 0);
});