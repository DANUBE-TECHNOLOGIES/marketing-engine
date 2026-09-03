"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  EXPECTED_BRANCH,
  EXPECTED_GITHUB_WORKFLOW_BLOB_SHA,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
} = require("../scripts/mse-25-30-preflight");
const {
  assertPreflightBaselineAttestation,
} = require("../src/modules/minisite-seo-enrichment/network-apply-audit");
const {
  assertBaselineAttestation,
  auditBaselineAttestation,
} = require("../src/modules/minisite-seo-enrichment/baseline-attestation-audit");

const BASE_SHA = "6cfc1dde265ad3f4ae376b467133ece612ff8343";

function attestation(overrides = {}) {
  return {
    ok: true,
    repository: "DANUBE-TECHNOLOGIES/marketing-engine",
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: GITHUB_WORKFLOW_NAME,
    workflowPath: GITHUB_WORKFLOW_PATH,
    workflowBlobSha: EXPECTED_GITHUB_WORKFLOW_BLOB_SHA,
    runId: 31955664054,
    headSha: BASE_SHA,
    headBranch: EXPECTED_BRANCH,
    event: "push",
    status: "completed",
    conclusion: "success",
    ...overrides,
  };
}

function rolloutReport() {
  const proof = attestation();
  return {
    repository: {
      validatedBaseSha: BASE_SHA,
      validatedBaselineAttestation: { ...proof },
    },
    preflight: {
      validatedBaseSha: BASE_SHA,
      baselineAttestation: { ...proof },
    },
    result: {
      preflight: {
        validatedBaseSha: BASE_SHA,
        baselineAttestation: { ...proof },
      },
    },
  };
}

test("MSE-25.30 recalcule une chaîne d'attestation CI cohérente", () => {
  const audit = auditBaselineAttestation(rolloutReport());
  assert.equal(audit.ok, true);
  assert.equal(audit.validatedBaseSha, BASE_SHA);
  assert.equal(audit.runId, 31955664054);
  assert.equal(audit.workflowPath, GITHUB_WORKFLOW_PATH);
  assert.equal(audit.workflowBlobSha, EXPECTED_GITHUB_WORKFLOW_BLOB_SHA);
  assert.deepEqual(audit.issues, []);
});

test("MSE-25.30 refuse une SHA baseline désynchronisée dans le rapport", () => {
  const report = rolloutReport();
  report.preflight.validatedBaseSha = "a".repeat(40);

  assert.throws(() => assertBaselineAttestation(report), (error) => {
    assert.equal(error.code, "MSE_25_30_ROLLOUT_BASELINE_CI_ATTESTATION_MISMATCH");
    assert.ok(error.details.issues.some((issue) => issue.code === "validated-base-sha-mismatch"));
    return true;
  });
});

test("MSE-25.30 refuse une attestation venant d'un run manuel, en échec ou d'une autre définition CI", () => {
  for (const mutated of [
    { event: "workflow_dispatch" },
    { conclusion: "failure" },
    { headBranch: "develop" },
    { workflowId: 123 },
    { headSha: "b".repeat(40) },
    { workflowPath: ".github/workflows/fake.yml" },
    { workflowBlobSha: "0".repeat(40) },
  ]) {
    const report = rolloutReport();
    report.result.preflight.baselineAttestation = attestation(mutated);
    assert.throws(
      () => assertBaselineAttestation(report),
      (error) => error.code === "MSE_25_30_ROLLOUT_BASELINE_CI_ATTESTATION_MISMATCH",
    );
  }
});

test("MSE-25.30 apply compare le preflight enregistré à une attestation GitHub fraîche", () => {
  const recorded = attestation();
  const live = attestation();
  const audit = assertPreflightBaselineAttestation({
    repository: {
      validatedBaseSha: BASE_SHA,
      validatedBaselineAttestation: recorded,
    },
  }, {
    validatedBaseSha: BASE_SHA,
  }, live);

  assert.equal(audit.ok, true);
  assert.equal(audit.validatedBaseSha, BASE_SHA);
  assert.equal(audit.preflightRunId, 31955664054);
  assert.equal(audit.liveRunId, 31955664054);
});

test("MSE-25.30 apply refuse un preflight dont la baseline a été substituée", () => {
  assert.throws(() => assertPreflightBaselineAttestation({
    repository: {
      validatedBaseSha: "a".repeat(40),
      validatedBaselineAttestation: attestation({ headSha: "a".repeat(40) }),
    },
  }, {
    validatedBaseSha: BASE_SHA,
  }, attestation()), (error) => {
    assert.equal(error.code, "MSE_25_30_NETWORK_ROLLOUT_BASELINE_CI_ATTESTATION_MISMATCH");
    return true;
  });
});
