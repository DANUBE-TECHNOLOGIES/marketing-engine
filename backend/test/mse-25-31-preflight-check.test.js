"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { assertReport } = require("../scripts/mse-25-31-preflight-check");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
} = require("../scripts/mse-25-31-ci-attestation");

const FP = "c".repeat(64);
const HEAD = "d".repeat(40);

function ciAttestation() {
  return {
    ok: true,
    repository: GITHUB_REPOSITORY,
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: GITHUB_WORKFLOW_NAME,
    workflowPath: GITHUB_WORKFLOW_PATH,
    workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
    runId: 321,
    headSha: HEAD,
    headBranch: EXPECTED_BRANCH,
    event: "push",
    status: "completed",
    conclusion: "success",
  };
}

function validReport() {
  return {
    version: "mse-25.31",
    operation: "preflight-quality-uplift",
    readOnly: true,
    writes: false,
    destructive: false,
    repository: {
      branch: EXPECTED_BRANCH,
      head: HEAD,
      dirty: false,
      workflowPath: GITHUB_WORKFLOW_PATH,
      workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
      ciAttestation: ciAttestation(),
    },
    context: {
      backendOrigin: "http://127.0.0.1:4000",
      tenantSlug: "mondescale",
      minimumWords: 120,
      topPages: 20,
    },
    planFingerprint: FP,
    preview: {
      readOnly: true,
      writes: false,
      destructive: false,
      planFingerprint: FP,
      allPages: [{ siteSlug: "gien", pageSlug: "avis", operationTypes: ["enrich-body"] }],
      executionPayloads: [{
        key: "gien:avis",
        siteSlug: "gien",
        pageSlug: "avis",
        operations: [{ type: "enrich-body", preserveExisting: true }],
        bodyCopyPreview: { title: "Informations utiles", html: "<p>Texte exact.</p>" },
        completeOperationTypes: ["enrich-body"],
        incompleteOperationTypes: [],
        payloadComplete: true,
      }],
    },
    executionPayloadAudit: {
      ok: true,
      candidateCount: 1,
      payloadCount: 1,
      completePayloadCount: 1,
      incompletePayloadCount: 0,
    },
    determinism: {
      verified: true,
      previewCount: 2,
      firstFingerprint: FP,
      secondFingerprint: FP,
      executionPayloadsVerified: true,
    },
  };
}

test("offline check accepts a coherent read-only preflight report with push CI proof", () => {
  const result = assertReport(validReport(), {
    expectedHead: HEAD,
    backendOrigin: "http://127.0.0.1:4000/",
    tenantSlug: "mondescale",
    minimumWords: 120,
  });
  assert.equal(result.ok, true);
  assert.equal(result.planFingerprint, FP);
  assert.equal(result.repository.head, HEAD);
  assert.equal(result.repository.ciAttestation.runId, 321);
  assert.equal(result.executionPayloadAudit.completePayloadCount, 1);
});

test("offline check rejects a preview fingerprint substituted after preflight", () => {
  const report = validReport();
  report.preview.planFingerprint = "e".repeat(64);
  assert.throws(
    () => assertReport(report),
    (error) => error.code === "MSE_25_31_PREFLIGHT_REPORT_FINGERPRINT_MISMATCH"
  );
});

test("offline check rejects an incoherent determinism proof", () => {
  const report = validReport();
  report.determinism.secondFingerprint = "f".repeat(64);
  assert.throws(
    () => assertReport(report),
    (error) => error.code === "MSE_25_31_PREFLIGHT_REPORT_DETERMINISM_INVALID"
  );
});

test("offline check recalculates payload coverage and rejects altered write evidence", () => {
  const report = validReport();
  report.preview.executionPayloads[0].bodyCopyPreview = null;
  assert.throws(
    () => assertReport(report),
    (error) => error.code === "MSE_25_31_PREFLIGHT_EXECUTION_PAYLOAD_INVALID"
  );
});

test("offline check rejects a stale recorded payload audit", () => {
  const report = validReport();
  report.executionPayloadAudit.completePayloadCount = 0;
  report.executionPayloadAudit.incompletePayloadCount = 1;
  assert.throws(
    () => assertReport(report),
    (error) => error.code === "MSE_25_31_PREFLIGHT_REPORT_EXECUTION_PAYLOAD_AUDIT_INVALID"
  );
});

test("offline check rejects substituted workflow or CI attestation", () => {
  const workflow = validReport();
  workflow.repository.workflowBlobSha = "f".repeat(40);
  assert.throws(
    () => assertReport(workflow),
    (error) => error.code === "MSE_25_31_PREFLIGHT_REPORT_CI_WORKFLOW_MISMATCH"
  );

  const attestation = validReport();
  attestation.repository.ciAttestation.headSha = "0".repeat(40);
  assert.throws(
    () => assertReport(attestation),
    (error) => error.code === "MSE_25_31_CI_ATTESTATION_INVALID"
  );
});

test("offline check binds report to branch head tenant backend and parameters", () => {
  for (const [options, code] of [
    [{ expectedBranch: "main" }, "MSE_25_31_PREFLIGHT_REPORT_BRANCH_MISMATCH"],
    [{ expectedHead: "0".repeat(40) }, "MSE_25_31_PREFLIGHT_REPORT_HEAD_MISMATCH"],
    [{ backendOrigin: "http://127.0.0.1:4999" }, "MSE_25_31_PREFLIGHT_REPORT_BACKEND_MISMATCH"],
    [{ tenantSlug: "other" }, "MSE_25_31_PREFLIGHT_REPORT_TENANT_MISMATCH"],
    [{ minimumWords: 140 }, "MSE_25_31_PREFLIGHT_REPORT_PARAMETER_MISMATCH"],
  ]) {
    assert.throws(
      () => assertReport(validReport(), options),
      (error) => error.code === code
    );
  }
});

test("offline check rejects any report that is not strictly read-only", () => {
  const report = validReport();
  report.writes = true;
  assert.throws(
    () => assertReport(report),
    (error) => error.code === "MSE_25_31_PREFLIGHT_REPORT_UNSAFE"
  );
});
