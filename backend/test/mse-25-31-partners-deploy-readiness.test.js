"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  REQUIRED_MODULES,
  assertModulesLoad,
  assertRepositoryReady,
} = require("../scripts/mse-25-31-partners-deploy-readiness");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
} = require("../scripts/mse-25-31-ci-attestation");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");

test("partner VM readiness requires the exact branch, clean tree and attested workflow", () => {
  const state = {
    branch: EXPECTED_BRANCH,
    head: "a".repeat(40),
    dirty: false,
    workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
  };
  assert.equal(assertRepositoryReady(state), state);
  assert.throws(
    () => assertRepositoryReady({ ...state, dirty: true }),
    (error) => error.code === "PARTNER_DEPLOY_DIRTY_WORKTREE"
  );
  assert.throws(
    () => assertRepositoryReady({ ...state, workflowBlobSha: "b".repeat(40) }),
    (error) => error.code === "PARTNER_DEPLOY_WORKFLOW_MISMATCH"
  );
});

test("partner VM readiness loads every deployment-critical module and contract", () => {
  const result = assertModulesLoad();
  assert.equal(result.loaded.length, REQUIRED_MODULES.length);
  assert.deepEqual(result.contracts.sort(), [
    "assertPartnerPagePublishable",
    "ensureNetworkPartnerPages",
    "listPageVersions",
    "partnerPageReadiness",
    "rollbackPageVersion",
    "saveDesignerPage",
  ].sort());
});
