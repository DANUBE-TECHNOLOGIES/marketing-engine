"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const {
  EXPECTED_BRANCH,
  assertRepositoryState,
  reportPath,
} = require("../scripts/mse-25-30-preflight");

test("MSE-25.30 preflight refuses an unexpected branch", () => {
  assert.throws(
    () => assertRepositoryState({ branch: "main", head: "abc", dirty: false }),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_BRANCH_MISMATCH");
      return true;
    }
  );
  assert.doesNotThrow(() => assertRepositoryState({ branch: EXPECTED_BRANCH, head: "abc", dirty: false }));
});

test("MSE-25.30 preflight refuses a dirty worktree by default", () => {
  assert.throws(
    () => assertRepositoryState({ branch: EXPECTED_BRANCH, head: "abc", dirty: true }),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_DIRTY_WORKTREE");
      return true;
    }
  );
  assert.doesNotThrow(() => assertRepositoryState({ branch: EXPECTED_BRANCH, head: "abc", dirty: true }, { allowDirty: true }));
});

test("MSE-25.30 preflight creates a timestamped JSON report path", () => {
  const value = reportPath();
  assert.equal(path.extname(value), ".json");
  assert.match(path.basename(value), /^mse-25-30-network-preview-/);
});
