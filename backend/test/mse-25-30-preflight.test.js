"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_VALIDATED_BASE_SHA,
  EXPECTED_BRANCH,
  assertRepositoryState,
} = require("../scripts/mse-25-30-preflight");

function validState(overrides = {}) {
  return {
    branch: EXPECTED_BRANCH,
    head: "1627cfca69ae02a7ea5c3a356cd3ebb6762a4bd4",
    dirty: false,
    validatedBaseSha: DEFAULT_VALIDATED_BASE_SHA,
    baselineAncestor: true,
    protectedChanges: [],
    ...overrides,
  };
}

test("preflight autorise des commits sans rapport apres la baseline validee", () => {
  assert.doesNotThrow(() => assertRepositoryState(validState()));
});

test("preflight refuse une baseline validee absente de l'historique courant", () => {
  assert.throws(
    () => assertRepositoryState(validState({ baselineAncestor: false })),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_BASELINE_MISMATCH");
      assert.equal(error.details.validatedBaseSha, DEFAULT_VALIDATED_BASE_SHA);
      return true;
    },
  );
});

test("preflight refuse un runtime MSE-25.30 modifie depuis la baseline validee", () => {
  const protectedChanges = [
    "backend/src/modules/minisite-seo-enrichment/service.js",
  ];
  assert.throws(
    () => assertRepositoryState(validState({ protectedChanges })),
    (error) => {
      assert.equal(error.code, "MSE_25_30_PREFLIGHT_RUNTIME_CHANGED");
      assert.deepEqual(error.details.protectedChanges, protectedChanges);
      return true;
    },
  );
});

test("les gardes branche et working tree restent actives", () => {
  assert.throws(
    () => assertRepositoryState(validState({ branch: "develop" })),
    (error) => error.code === "MSE_25_30_PREFLIGHT_BRANCH_MISMATCH",
  );
  assert.throws(
    () => assertRepositoryState(validState({ dirty: true })),
    (error) => error.code === "MSE_25_30_PREFLIGHT_DIRTY_WORKTREE",
  );
});
