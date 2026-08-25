"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { certify } = require("../scripts/mse-25-50-certify");

function history(overrides = {}) {
  return {
    type: "mse-25.50-search-demand-history",
    readOnly: true,
    writes: false,
    noDataIsNotNoDemand: true,
    policy: { automaticWrites: false, humanReviewRequired: true },
    snapshots: [{ automaticWriteCount: 0 }],
    ...overrides,
  };
}

test("safe read-only history is certifiable", () => {
  assert.deepEqual(certify(history()), { certified: true, violations: [] });
});

test("automatic writes fail certification", () => {
  const result = certify(history({ snapshots: [{ automaticWriteCount: 1 }] }));
  assert.equal(result.certified, false);
  assert.ok(result.violations.includes("AUTOMATIC_WRITE_OBSERVED"));
});

test("missing no-data policy fails certification", () => {
  const result = certify(history({ noDataIsNotNoDemand: false }));
  assert.equal(result.certified, false);
  assert.ok(result.violations.includes("NO_DATA_POLICY_MISSING"));
});

test("human review remains mandatory", () => {
  const result = certify(history({ policy: { automaticWrites: false, humanReviewRequired: false } }));
  assert.equal(result.certified, false);
  assert.ok(result.violations.includes("HUMAN_REVIEW_NOT_REQUIRED"));
});
