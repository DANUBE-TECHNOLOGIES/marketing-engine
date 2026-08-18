"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApprovalManifest } = require("../scripts/mse-25-31-approval-manifest");
const { buildExecutionPlan } = require("../scripts/mse-25-31-execution-plan");
const { assertApplyAuthorization } = require("../scripts/mse-25-31-apply-gate");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
} = require("../scripts/mse-25-31-ci-attestation");

const FP = "a".repeat(64);
const HEAD = "b".repeat(40);

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

function preflightReport({ payloadComplete = true } = {}) {
  const operationType = payloadComplete ? "enrich-body" : "strengthen-meta-description";
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
    context: { backendOrigin: "http://127.0.0.1:4000", tenantSlug: "mondescale", minimumWords: 120, topPages: 20 },
    planFingerprint: FP,
    preview: {
      readOnly: true,
      writes: false,
      destructive: false,
      planFingerprint: FP,
      allPages: [{
        agencyId: 1,
        siteSlug: "gien",
        city: "Gien",
        pageSlug: "avis",
        priority: "high",
        priorityScore: 70,
        executionClass: payloadComplete ? "simulation-ready" : "manual-review-needed",
        projectedReduction: 2,
        operationTypes: [operationType],
        manualReviewReasons: payloadComplete ? [] : [operationType],
      }],
      executionPayloads: [{
        key: "gien:avis",
        agencyId: 1,
        siteSlug: "gien",
        city: "Gien",
        pageSlug: "avis",
        operations: [{ type: operationType, preserveExisting: payloadComplete }],
        bodyCopyPreview: payloadComplete ? { title: "Informations utiles", html: "<p>Texte exact approuvé.</p>" } : null,
        safeguards: payloadComplete ? { preserveManualCopy: true } : {},
        completeOperationTypes: payloadComplete ? [operationType] : [],
        incompleteOperationTypes: payloadComplete ? [] : [operationType],
        payloadComplete,
      }],
    },
    executionPayloadAudit: {
      ok: true,
      candidateCount: 1,
      payloadCount: 1,
      completePayloadCount: payloadComplete ? 1 : 0,
      incompletePayloadCount: payloadComplete ? 0 : 1,
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

function evidence(options) {
  const report = preflightReport(options);
  const manifest = createApprovalManifest(report);
  manifest.candidates[0].approved = true;
  manifest.candidates[0].reviewer = "operator@example.test";
  manifest.candidates[0].reviewedAt = "2026-08-17T22:00:00.000Z";
  const executionPlan = buildExecutionPlan(manifest, report);
  return { report, manifest, executionPlan };
}

test("apply gate authorizes complete sealed evidence without performing writes", () => {
  const { report, manifest, executionPlan } = evidence();
  const result = assertApplyAuthorization({
    executionPlan,
    approvalManifest: manifest,
    preflightReport: report,
    repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
    confirm: true,
    approvedExecutionPlanFingerprint: executionPlan.executionPlanFingerprint,
  });
  assert.equal(result.ok, true);
  assert.equal(result.authorized, true);
  assert.equal(result.confirmationVerified, true);
  assert.equal(result.readOnlyGate, true);
  assert.equal(result.writes, false);
  assert.equal(result.publicWrites, false);
  assert.equal(result.approvedPageCount, 1);
});

test("apply gate refuses missing explicit confirmation", () => {
  const { report, manifest, executionPlan } = evidence();
  assert.throws(
    () => assertApplyAuthorization({
      executionPlan,
      approvalManifest: manifest,
      preflightReport: report,
      repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
      approvedExecutionPlanFingerprint: executionPlan.executionPlanFingerprint,
    }),
    (error) => error.code === "MSE_25_31_APPLY_CONFIRMATION_REQUIRED"
  );
});

test("apply gate refuses missing or substituted execution fingerprint", () => {
  const { report, manifest, executionPlan } = evidence();
  assert.throws(
    () => assertApplyAuthorization({
      executionPlan,
      approvalManifest: manifest,
      preflightReport: report,
      repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
      confirm: true,
    }),
    (error) => error.code === "MSE_25_31_APPLY_EXECUTION_FINGERPRINT_REQUIRED"
  );
  assert.throws(
    () => assertApplyAuthorization({
      executionPlan,
      approvalManifest: manifest,
      preflightReport: report,
      repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
      confirm: true,
      approvedExecutionPlanFingerprint: "f".repeat(64),
    }),
    (error) => error.code === "MSE_25_31_APPLY_EXECUTION_FINGERPRINT_MISMATCH"
  );
});

test("apply gate refuses another head or dirty repository", () => {
  const { report, manifest, executionPlan } = evidence();
  assert.throws(
    () => assertApplyAuthorization({
      executionPlan,
      approvalManifest: manifest,
      preflightReport: report,
      repository: { branch: EXPECTED_BRANCH, head: "c".repeat(40), dirty: false },
      confirm: true,
      approvedExecutionPlanFingerprint: executionPlan.executionPlanFingerprint,
    }),
    (error) => error.code === "MSE_25_31_APPLY_HEAD_MISMATCH"
  );
  assert.throws(
    () => assertApplyAuthorization({
      executionPlan,
      approvalManifest: manifest,
      preflightReport: report,
      repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: true },
      confirm: true,
      approvedExecutionPlanFingerprint: executionPlan.executionPlanFingerprint,
    }),
    (error) => error.code === "MSE_25_31_PREFLIGHT_DIRTY_WORKTREE"
  );
});

test("apply gate refuses an execution plan with no approved pages", () => {
  const report = preflightReport();
  const manifest = createApprovalManifest(report);
  const executionPlan = buildExecutionPlan(manifest, report);
  assert.throws(
    () => assertApplyAuthorization({
      executionPlan,
      approvalManifest: manifest,
      preflightReport: report,
      repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
      confirm: true,
      approvedExecutionPlanFingerprint: executionPlan.executionPlanFingerprint,
    }),
    (error) => error.code === "MSE_25_31_APPLY_NO_APPROVED_PAGES"
  );
});

test("apply gate refuses an approved page whose final write payload is incomplete", () => {
  const { report, manifest, executionPlan } = evidence({ payloadComplete: false });
  assert.equal(executionPlan.executable, false);
  assert.equal(executionPlan.summary.payloadIncompleteCount, 1);
  assert.throws(
    () => assertApplyAuthorization({
      executionPlan,
      approvalManifest: manifest,
      preflightReport: report,
      repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
      confirm: true,
      approvedExecutionPlanFingerprint: executionPlan.executionPlanFingerprint,
    }),
    (error) => {
      assert.equal(error.code, "MSE_25_31_APPLY_INCOMPLETE_WRITE_PAYLOAD");
      assert.equal(error.details.payloadIncompleteCount, 1);
      return true;
    }
  );
});