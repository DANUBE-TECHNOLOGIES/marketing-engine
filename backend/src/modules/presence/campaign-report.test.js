"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { summarizeExecutions, delta } = require("./campaign-report");

test("campaign execution summary reports verified success rate", () => {
  const summary = summarizeExecutions([
    { status: "verified" },
    { status: "verified" },
    { status: "submitted" },
    { status: "failed" }
  ]);
  assert.equal(summary.total, 4);
  assert.equal(summary.verified, 2);
  assert.equal(summary.submitted, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.successRate, 50);
});

test("campaign report delta preserves direction", () => {
  assert.equal(delta(82, 70), 12);
  assert.equal(delta(3, 8), -5);
});
