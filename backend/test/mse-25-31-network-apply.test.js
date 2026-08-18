"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createApprovalManifest } = require("../scripts/mse-25-31-approval-manifest");
const { buildExecutionPlan } = require("../scripts/mse-25-31-execution-plan");
const { buildQualityUpliftWriteIntents } = require("../src/modules/minisite-seo-enrichment/quality-uplift-write-intent");
const { run } = require("../scripts/mse-25-31-network-apply");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");

const HEAD = "a".repeat(40);
const PLAN_FP = "b".repeat(64);
function currentPage() {
  return { title: "Avis clients", slug: "avis", status: "published", published: true, seoTitle: "Avis", metaDescription: "Avis actuels", blocks: [{ id: "hero-1", type: "hero", status: "published", position: 0, content: { title: "Avis clients" } }] };
}
function preflight() {
  return {
    version: "mse-25.31", operation: "preflight-quality-uplift", generatedAt: new Date().toISOString(), readOnly: true, writes: false, destructive: false,
    repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
    context: { backendOrigin: "http://127.0.0.1:4000", tenantSlug: "mondescale", minimumWords: 120, topPages: 20 },
    planFingerprint: PLAN_FP,
    preview: {
      readOnly: true, writes: false, destructive: false, planFingerprint: PLAN_FP,
      allPages: [{ agencyId: 1, siteSlug: "gien", city: "Gien", pageSlug: "avis", priority: "medium", priorityScore: 50, executionClass: "simulation-ready", beforeWarnings: 1, projectedWarnings: 0, projectedReduction: 1, operationTypes: ["enrich-body"], manualReviewReasons: [] }],
      executionPayloads: [{ key: "gien:avis", agencyId: 1, siteSlug: "gien", city: "Gien", pageSlug: "avis", operations: [{ type: "enrich-body", preserveExisting: true }], bodyCopyPreview: { title: "Votre agence à Gien", html: "<p>Texte exact approuvé.</p>" }, safeguards: { preserveManualCopy: true }, completeOperationTypes: ["enrich-body"], incompleteOperationTypes: [], payloadComplete: true }],
    },
    executionPayloadAudit: { ok: true, candidateCount: 1, payloadCount: 1, completePayloadCount: 1, incompletePayloadCount: 0 },
    determinism: { verified: true, previewCount: 2, firstFingerprint: PLAN_FP, secondFingerprint: PLAN_FP, executionPayloadsVerified: true },
  };
}
function write(file, value) { fs.writeFileSync(file, JSON.stringify(value), "utf8"); return file; }

test("network apply dry-run revalidates every proof and performs zero persistence writes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse2531-apply-"));
  const report = preflight();
  const manifest = createApprovalManifest(report);
  manifest.candidates[0].approved = true;
  manifest.candidates[0].reviewer = "operator@example.test";
  manifest.candidates[0].reviewedAt = "2026-08-18T10:00:00.000Z";
  const executionPlan = buildExecutionPlan(manifest, report);
  const live = currentPage();
  const writeIntent = buildQualityUpliftWriteIntents({ executionPlan, currentPages: [{ agencyId: 1, siteSlug: "gien", page: live }] });

  const preflightFile = write(path.join(dir, "preflight.json"), report);
  const approvalFile = write(path.join(dir, "approval.json"), manifest);
  const executionFile = write(path.join(dir, "execution.json"), executionPlan);
  const writeIntentFile = write(path.join(dir, "write-intent.json"), writeIntent);
  const rolloutFile = path.join(dir, "rollout.json");

  const result = await run({
    preflightReportPath: preflightFile,
    approvalManifestPath: approvalFile,
    executionPlanPath: executionFile,
    writeIntentPath: writeIntentFile,
    reportPath: rolloutFile,
    dryRun: true,
    confirm: true,
    approvedExecutionPlanFingerprint: executionPlan.executionPlanFingerprint,
    approvedWriteIntentFingerprint: writeIntent.writeIntentFingerprint,
    emitOutput: false,
    repositoryReader: () => ({ branch: EXPECTED_BRANCH, head: HEAD, dirty: false }),
    request: async () => live,
  });

  assert.equal(result.ok, true);
  assert.equal(result.dryRun, true);
  assert.equal(result.writes, false);
  assert.equal(result.pagesWritten, 0);
  assert.ok(fs.existsSync(rolloutFile));
  assert.equal(result.report.proof.applyAuthorization.authorized, true);
  assert.equal(result.report.proof.writeIntentCheck.ok, true);
});
