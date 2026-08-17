"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApprovalManifest } = require("../scripts/mse-25-31-approval-manifest");
const { buildExecutionPlan } = require("../scripts/mse-25-31-execution-plan");
const { assertExecutionPlan } = require("../scripts/mse-25-31-execution-plan-check");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");

const FP = "a".repeat(64);
const HEAD = "b".repeat(40);

function sourceReport() {
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
      executionPayloads: [{
        key: "gien:avis",
        agencyId: 1,
        siteSlug: "gien",
        city: "Gien",
        pageSlug: "avis",
        operations: [{ type: "enrich-body", preserveExisting: true }],
        bodyCopyPreview: { title: "Informations utiles", html: "<p>Texte exact approuvé.</p>" },
        safeguards: { preserveManualCopy: true },
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

function approvedManifest(report) {
  const manifest = createApprovalManifest(report);
  manifest.candidates[0].approved = true;
  manifest.candidates[0].reviewer = "operator@example.test";
  manifest.candidates[0].reviewedAt = "2026-08-17T21:30:00.000Z";
  return manifest;
}

test("execution plan check accepts a plan rebuilt from the same approved evidence", () => {
  const report = sourceReport();
  const manifest = approvedManifest(report);
  const plan = buildExecutionPlan(manifest, report);
  const result = assertExecutionPlan(plan, manifest, report);
  assert.equal(result.ok, true);
  assert.equal(result.executable, true);
  assert.equal(result.publicWrites, false);
  assert.equal(result.executionPlanFingerprint, plan.executionPlanFingerprint);
});

test("execution plan check rejects a substituted approved page", () => {
  const report = sourceReport();
  const manifest = approvedManifest(report);
  const plan = buildExecutionPlan(manifest, report);
  plan.pages[0].siteSlug = "nevers";
  assert.throws(
    () => assertExecutionPlan(plan, manifest, report),
    (error) => error.code === "MSE_25_31_EXECUTION_PLAN_MISMATCH"
  );
});

test("execution plan check rejects a substituted sealed write payload", () => {
  const report = sourceReport();
  const manifest = approvedManifest(report);
  const plan = buildExecutionPlan(manifest, report);
  plan.pages[0].executionPayload.bodyCopyPreview.html = "<p>Texte substitué.</p>";
  assert.throws(
    () => assertExecutionPlan(plan, manifest, report),
    (error) => error.code === "MSE_25_31_EXECUTION_PLAN_MISMATCH"
  );
});

test("execution plan check rejects a substituted execution fingerprint", () => {
  const report = sourceReport();
  const manifest = approvedManifest(report);
  const plan = buildExecutionPlan(manifest, report);
  plan.executionPlanFingerprint = "f".repeat(64);
  assert.throws(
    () => assertExecutionPlan(plan, manifest, report),
    (error) => error.code === "MSE_25_31_EXECUTION_PLAN_MISMATCH"
  );
});

test("execution plan check refuses any write-enabled safety flags", () => {
  const report = sourceReport();
  const manifest = approvedManifest(report);
  const plan = buildExecutionPlan(manifest, report);
  plan.publicWrites = true;
  assert.throws(
    () => assertExecutionPlan(plan, manifest, report),
    (error) => error.code === "MSE_25_31_EXECUTION_PLAN_SAFETY_INVALID"
  );
});

test("execution plan check follows approval changes and rejects a stale sealed plan", () => {
  const report = sourceReport();
  const manifest = approvedManifest(report);
  const plan = buildExecutionPlan(manifest, report);
  manifest.candidates[0].reviewer = "replacement-reviewer@example.test";
  assert.throws(
    () => assertExecutionPlan(plan, manifest, report),
    (error) => error.code === "MSE_25_31_EXECUTION_PLAN_MISMATCH"
  );
});
