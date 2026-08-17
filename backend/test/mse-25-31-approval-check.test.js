"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { createApprovalManifest } = require("../scripts/mse-25-31-approval-manifest");
const { assertApprovalManifest } = require("../scripts/mse-25-31-approval-check");
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

test("approval check accepts explicit audited decisions without public writes", () => {
  const report = preflightReport();
  const manifest = createApprovalManifest(report);
  manifest.candidates[0].approved = true;
  manifest.candidates[0].reviewer = "operator@example.test";
  manifest.candidates[0].reviewedAt = "2026-08-17T19:30:00.000Z";
  const result = assertApprovalManifest(manifest, report);
  assert.equal(result.ok, true);
  assert.equal(result.publicWrites, false);
  assert.equal(result.summary.approvedCount, 1);
  assert.equal(result.summary.pendingOrRejectedCount, 1);
  assert.equal(result.approvedPages[0].key, "gien:avis");
});

test("approval check rejects candidate content changed after preflight", () => {
  const report = preflightReport();
  const manifest = createApprovalManifest(report);
  manifest.candidates[0].operationTypes = ["rewrite-everything"];
  assert.throws(
    () => assertApprovalManifest(manifest, report),
    (error) => error.code === "MSE_25_31_APPROVAL_MANIFEST_CANDIDATE_SET_MISMATCH"
  );
});

test("approval check requires reviewer and timestamp for every approved page", () => {
  const report = preflightReport();
  const manifest = createApprovalManifest(report);
  manifest.candidates[0].approved = true;
  assert.throws(
    () => assertApprovalManifest(manifest, report),
    (error) => error.code === "MSE_25_31_APPROVAL_AUDIT_REQUIRED"
  );
});

test("approval check requires an explicit boolean decision field", () => {
  const report = preflightReport();
  const manifest = createApprovalManifest(report);
  delete manifest.candidates[0].approved;
  assert.throws(
    () => assertApprovalManifest(manifest, report),
    (error) => error.code === "MSE_25_31_APPROVAL_DECISION_REQUIRED"
  );
});

test("approval check rejects manifest bound to another preflight context", () => {
  const report = preflightReport();
  const manifest = createApprovalManifest(report);
  manifest.sourcePreflight.context.tenantSlug = "other";
  assert.throws(
    () => assertApprovalManifest(manifest, report),
    (error) => error.code === "MSE_25_31_APPROVAL_MANIFEST_CONTEXT_MISMATCH"
  );
});
