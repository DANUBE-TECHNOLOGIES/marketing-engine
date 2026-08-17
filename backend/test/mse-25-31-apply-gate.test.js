"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApprovalManifest } = require("../scripts/mse-25-31-approval-manifest");
const { buildExecutionPlan } = require("../scripts/mse-25-31-execution-plan");
const { assertApplyAuthorization } = require("../scripts/mse-25-31-apply-gate");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");

const FP = "a".repeat(64);
const HEAD = "b".repeat(40);

function preflightReport() {
  return {
    version: "mse-25.31",
    operation: "preflight-quality-uplift",
    readOnly: true,
    writes: false,
    destructive: false,
    repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
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
        executionClass: "simulation-ready",
        projectedReduction: 2,
        operationTypes: ["enrich-body"],
        manualReviewReasons: [],
      }],
    },
    determinism: { verified: true, previewCount: 2, firstFingerprint: FP, secondFingerprint: FP },
  };
}

function evidence() {
  const report = preflightReport();
  const manifest = createApprovalManifest(report);
  manifest.candidates[0].approved = true;
  manifest.candidates[0].reviewer = "operator@example.test";
  manifest.candidates[0].reviewedAt = "2026-08-17T22:00:00.000Z";
  const executionPlan = buildExecutionPlan(manifest, report);
  return { report, manifest, executionPlan };
}

test("apply gate authorizes evidence without performing writes", () => {
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
