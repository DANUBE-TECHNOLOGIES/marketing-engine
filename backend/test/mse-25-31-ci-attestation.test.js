"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
  assertAttestation,
  assertSameAttestation,
  selectSuccessfulPushRun,
} = require("../scripts/mse-25-31-ci-attestation");

const HEAD = "a".repeat(40);
const BRANCH = "feature/mse-25-31-local-seo-quality-uplift";
function run(id = 123) {
  return {
    id,
    name: GITHUB_WORKFLOW_NAME,
    head_sha: HEAD,
    head_branch: BRANCH,
    event: "push",
    status: "completed",
    conclusion: "success",
    html_url: `https://github.com/example/actions/runs/${id}`,
  };
}
function attestation(id = 123) {
  return {
    ok: true,
    repository: GITHUB_REPOSITORY,
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: GITHUB_WORKFLOW_NAME,
    workflowPath: GITHUB_WORKFLOW_PATH,
    workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
    runId: id,
    headSha: HEAD,
    headBranch: BRANCH,
    event: "push",
    status: "completed",
    conclusion: "success",
  };
}

test("CI attestation selects only the successful push run on the exact head and branch", () => {
  const selected = selectSuccessfulPushRun({ workflow_runs: [
    { ...run(1), event: "pull_request" },
    { ...run(2), head_branch: "other" },
    run(3),
  ] }, HEAD, { expectedBranch: BRANCH });
  assert.equal(selected.runId, 3);
  assert.equal(selected.workflowBlobSha, EXPECTED_WORKFLOW_BLOB_SHA);
});

test("CI attestation validates exact workflow head branch and successful push result", () => {
  assert.equal(assertAttestation(attestation(), { head: HEAD, branch: BRANCH }).runId, 123);
  for (const broken of [
    { ...attestation(), headSha: "b".repeat(40) },
    { ...attestation(), headBranch: "other" },
    { ...attestation(), event: "pull_request" },
    { ...attestation(), conclusion: "failure" },
    { ...attestation(), workflowBlobSha: "f".repeat(40) },
  ]) {
    assert.throws(
      () => assertAttestation(broken, { head: HEAD, branch: BRANCH }),
      (error) => error.code === "MSE_25_31_CI_ATTESTATION_INVALID"
    );
  }
});

test("apply-time CI proof must be the same run sealed by preflight", () => {
  const result = assertSameAttestation(attestation(123), attestation(123), { head: HEAD, branch: BRANCH });
  assert.equal(result.ok, true);
  assert.equal(result.runId, 123);
  assert.throws(
    () => assertSameAttestation(attestation(123), attestation(124), { head: HEAD, branch: BRANCH }),
    (error) => error.code === "MSE_25_31_CI_ATTESTATION_CHANGED"
  );
});
