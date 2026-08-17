"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createApprovalManifest } = require("../scripts/mse-25-31-approval-manifest");
const { buildExecutionPlan } = require("../scripts/mse-25-31-execution-plan");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");

const FP = "a".repeat(64);
const HEAD = "b".repeat(40);

function report() {
  return {
    version: "mse-25.31",
    operation: "preflight-quality-uplift",
    readOnly: true,
    writes: false,
    destructive: false,
    repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
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
      allPages: [
        {
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
        },
        {
          agencyId: 2,
          siteSlug: "nevers",
          city: "Nevers",
          pageSlug: "services",
          priority: "medium",
          priorityScore: 40,
          executionClass: "manual-review-needed",
          projectedReduction: 1,
          operationTypes: ["strengthen-meta-description"],
          manualReviewReasons: ["strengthen-meta-description"],
        },
      ],
    },
    determinism: {
      verified: true,
      previewCount: 2,
      firstFingerprint: FP,
      secondFingerprint: FP,
    },
  };
}

function approvedManifest(sourceReport = report()) {
  const manifest = createApprovalManifest(sourceReport);
  manifest.candidates[0].approved = true;
  manifest.candidates[0].reviewer = "operator@example.test";
  manifest.candidates[0].reviewedAt = "2026-08-17T20:30:00.000Z";
  manifest.candidates[0].note = "validated";
  return manifest;
}

test("execution plan contains only explicitly approved pages and never writes", () => {
  const source = report();
  const plan = buildExecutionPlan(approvedManifest(source), source);
  assert.equal(plan.readOnly, true);
  assert.equal(plan.writes, false);
  assert.equal(plan.destructive, false);
  assert.equal(plan.publicWrites, false);
  assert.equal(plan.executable, true);
  assert.equal(plan.pages.length, 1);
  assert.equal(plan.pages[0].key, "gien:avis");
  assert.equal(plan.summary.approvedCount, 1);
  assert.equal(plan.summary.skippedCount, 1);
  assert.match(plan.executionPlanFingerprint, /^[0-9a-f]{64}$/);
  assert.match(plan.source.approvalDecisionFingerprint, /^[0-9a-f]{64}$/);
});

test("execution plan is non-executable when no page is approved", () => {
  const source = report();
  const plan = buildExecutionPlan(createApprovalManifest(source), source);
  assert.equal(plan.executable, false);
  assert.equal(plan.pages.length, 0);
  assert.equal(plan.summary.approvedCount, 0);
  assert.equal(plan.summary.skippedCount, 2);
});

test("execution plan fingerprint changes when an approval audit decision changes", () => {
  const source = report();
  const firstManifest = approvedManifest(source);
  const first = buildExecutionPlan(firstManifest, source);
  const secondManifest = approvedManifest(source);
  secondManifest.candidates[0].reviewer = "second-reviewer@example.test";
  const second = buildExecutionPlan(secondManifest, source);
  assert.notEqual(first.source.approvalDecisionFingerprint, second.source.approvalDecisionFingerprint);
  assert.notEqual(first.executionPlanFingerprint, second.executionPlanFingerprint);
});

test("execution plan refuses approval candidate mutation inherited from manifest", () => {
  const source = report();
  const manifest = approvedManifest(source);
  manifest.candidates[0].operationTypes = ["rewrite-everything"];
  assert.throws(
    () => buildExecutionPlan(manifest, source),
    (error) => error.code === "MSE_25_31_APPROVAL_MANIFEST_CANDIDATE_SET_MISMATCH"
  );
});

test("execution plan carries approved manual-review pages only after explicit audit", () => {
  const source = report();
  const manifest = createApprovalManifest(source);
  manifest.candidates[1].approved = true;
  manifest.candidates[1].reviewer = "seo-review@example.test";
  manifest.candidates[1].reviewedAt = "2026-08-17T20:31:00.000Z";
  const plan = buildExecutionPlan(manifest, source);
  assert.equal(plan.summary.approvedManualReviewCount, 1);
  assert.equal(plan.pages[0].executionClass, "manual-review-needed");
  assert.deepEqual(plan.pages[0].manualReviewReasons, ["strengthen-meta-description"]);
});
