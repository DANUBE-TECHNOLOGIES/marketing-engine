"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { digest } = require("../scripts/mse-25-31-rollout-report-check");
const { run } = require("../scripts/mse-25-31-post-rollout-validate");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
} = require("../scripts/mse-25-31-ci-attestation");

const BRANCH = "feature/mse-25-31-local-seo-quality-uplift";
const HEAD = "a".repeat(40);
function ciAttestation() {
  return { ok: true, repository: GITHUB_REPOSITORY, workflowId: GITHUB_WORKFLOW_ID, workflowName: GITHUB_WORKFLOW_NAME, workflowPath: GITHUB_WORKFLOW_PATH, workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA, runId: 123, headSha: HEAD, headBranch: BRANCH, event: "push", status: "completed", conclusion: "success" };
}
function writeJson(dir, name, value) { const file = path.join(dir, name); fs.writeFileSync(file, JSON.stringify(value), "utf8"); return file; }

function rollout() {
  const report = {
    type: "mse-25.31-network-rollout-report",
    repository: { branch: BRANCH, head: HEAD, dirty: false },
    context: { tenantSlug: "mondescale" },
    proof: {
      preflightCheck: { ok: true },
      ciAttestationCheck: { ok: true, runId: 123 },
      liveCiAttestation: ciAttestation(),
      applyAuthorization: { authorized: true },
      writeIntentCheck: { ok: true },
      executionPlanFingerprint: "b".repeat(64),
      writeIntentFingerprint: "c".repeat(64),
    },
    result: { ok: true, dryRun: false, writes: true, rollbackReady: true, executionPlanFingerprint: "b".repeat(64), writeIntentFingerprint: "c".repeat(64), pagesWritten: 1, rollbackSnapshots: 1 },
    rollbackManifest: [{ agencyId: 1, siteSlug: "gien", pageSlug: "avis", rollbackVersionId: "v1" }],
  };
  report.reportFingerprint = digest({ type: report.type, repository: report.repository, context: report.context, proof: report.proof, result: report.result, rollbackManifest: report.rollbackManifest });
  return report;
}

function preflight() {
  return {
    version: "mse-25.31", operation: "preflight-quality-uplift", readOnly: true, writes: false, destructive: false,
    repository: { branch: BRANCH, head: HEAD, dirty: false },
    context: { backendOrigin: "http://127.0.0.1:4000", tenantSlug: "mondescale", minimumWords: 120, topPages: 20 },
    planFingerprint: "d".repeat(64),
    preview: { readOnly: true, writes: false, destructive: false, planFingerprint: "d".repeat(64), allPages: [{ siteSlug: "gien", pageSlug: "avis", beforeWarnings: 2, projectedWarnings: 0 }], executionPayloads: [] },
    executionPayloadAudit: { ok: true, candidateCount: 1, payloadCount: 0, completePayloadCount: 0, incompletePayloadCount: 0 },
    determinism: { verified: true, previewCount: 2, firstFingerprint: "d".repeat(64), secondFingerprint: "d".repeat(64), executionPayloadsVerified: true },
  };
}

test("post-rollout validator accepts the projected warning reduction", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse2531-post-"));
  const rolloutFile = writeJson(dir, "rollout.json", rollout());
  const preflightFile = writeJson(dir, "preflight.json", preflight());
  const executionFile = writeJson(dir, "execution.json", { executionPlanFingerprint: "b".repeat(64), pages: [{ siteSlug: "gien", pageSlug: "avis", projectedReduction: 2 }] });
  const result = await run({ rolloutReportPath: rolloutFile, preflightReportPath: preflightFile, executionPlanPath: executionFile, emitOutput: false, previewRunner: async () => ({ readOnly: true, writes: false, destructive: false, allPages: [] }) });
  assert.equal(result.ok, true);
  assert.equal(result.actualNetworkReduction, 2);
  assert.equal(result.pages[0].afterWarnings, 0);
});

test("post-rollout validator rejects insufficient reduction", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse2531-post-"));
  const rolloutFile = writeJson(dir, "rollout.json", rollout());
  const preflightFile = writeJson(dir, "preflight.json", preflight());
  const executionFile = writeJson(dir, "execution.json", { executionPlanFingerprint: "b".repeat(64), pages: [{ siteSlug: "gien", pageSlug: "avis", projectedReduction: 2 }] });
  await assert.rejects(
    () => run({ rolloutReportPath: rolloutFile, preflightReportPath: preflightFile, executionPlanPath: executionFile, emitOutput: false, previewRunner: async () => ({ readOnly: true, writes: false, destructive: false, allPages: [{ siteSlug: "gien", pageSlug: "avis", beforeWarnings: 1 }] }) }),
    (error) => error.code === "MSE_25_31_POST_ROLLOUT_VALIDATION_FAILED"
  );
});
