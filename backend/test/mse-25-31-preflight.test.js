"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EXPECTED_BRANCH,
  assertDeterministicExecutionPayloads,
  assertDeterministicPreview,
  assertExecutionPayloadCoverage,
  assertFingerprint,
  assertRepositoryState,
  assertSafePreview,
  run,
} = require("../scripts/mse-25-31-preflight");

const FP_A = "a".repeat(64);
const FP_B = "b".repeat(64);
const safePreview = (fingerprint = FP_A) => ({
  readOnly: true,
  writes: false,
  destructive: false,
  planFingerprint: fingerprint,
});

function completePreviewPayload() {
  return {
    ...safePreview(),
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
  };
}

test("preflight accepts only a valid sha256 plan fingerprint", () => {
  assert.equal(assertFingerprint(FP_A), FP_A);
  assert.throws(
    () => assertFingerprint("not-a-fingerprint"),
    (error) => error.code === "MSE_25_31_PREFLIGHT_FINGERPRINT_INVALID"
  );
});

test("preflight independently refuses unsafe preview payloads", () => {
  assert.equal(assertSafePreview(safePreview()).readOnly, true);
  for (const preview of [
    { ...safePreview(), readOnly: false },
    { ...safePreview(), writes: true },
    { ...safePreview(), destructive: true },
  ]) {
    assert.throws(
      () => assertSafePreview(preview),
      (error) => error.code === "MSE_25_31_PREFLIGHT_UNSAFE_PREVIEW"
    );
  }
});

test("preflight refuses a plan whose fingerprint changes between two previews", () => {
  assert.throws(
    () => assertDeterministicPreview(safePreview(FP_A), safePreview(FP_B)),
    (error) => error.code === "MSE_25_31_PREFLIGHT_NON_DETERMINISTIC_PLAN"
  );
});

test("preflight verifies exact payload coverage and classification", () => {
  const audit = assertExecutionPayloadCoverage(completePreviewPayload());
  assert.equal(audit.ok, true);
  assert.equal(audit.candidateCount, 1);
  assert.equal(audit.payloadCount, 1);
  assert.equal(audit.completePayloadCount, 1);
  assert.equal(audit.incompletePayloadCount, 0);
});

test("preflight refuses missing or falsely classified execution payloads", () => {
  const missing = completePreviewPayload();
  missing.executionPayloads = [];
  assert.throws(
    () => assertExecutionPayloadCoverage(missing),
    (error) => error.code === "MSE_25_31_PREFLIGHT_EXECUTION_PAYLOAD_INVALID"
  );

  const falsified = completePreviewPayload();
  falsified.executionPayloads[0].payloadComplete = false;
  falsified.executionPayloads[0].completeOperationTypes = [];
  falsified.executionPayloads[0].incompleteOperationTypes = ["enrich-body"];
  assert.throws(
    () => assertExecutionPayloadCoverage(falsified),
    (error) => error.code === "MSE_25_31_PREFLIGHT_EXECUTION_PAYLOAD_INVALID"
  );
});

test("preflight refuses two previews with different exact write payloads", () => {
  const first = completePreviewPayload();
  const second = completePreviewPayload();
  second.executionPayloads[0].bodyCopyPreview.html = "<p>Autre texte.</p>";
  assert.throws(
    () => assertDeterministicExecutionPayloads(first, second),
    (error) => error.code === "MSE_25_31_PREFLIGHT_NON_DETERMINISTIC_EXECUTION_PAYLOAD"
  );
});

test("preflight requires the dedicated branch and a clean worktree", () => {
  assert.equal(
    assertRepositoryState({ branch: EXPECTED_BRANCH, head: "1".repeat(40), dirty: false }).branch,
    EXPECTED_BRANCH
  );
  assert.throws(
    () => assertRepositoryState({ branch: "main", head: "1".repeat(40), dirty: false }),
    (error) => error.code === "MSE_25_31_PREFLIGHT_BRANCH_MISMATCH"
  );
  assert.throws(
    () => assertRepositoryState({ branch: EXPECTED_BRANCH, head: "1".repeat(40), dirty: true }),
    (error) => error.code === "MSE_25_31_PREFLIGHT_DIRTY_WORKTREE"
  );
});

test("preflight runs the read-only network preview twice and archives the complete candidate set", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-31-preflight-"));
  const output = path.join(directory, "report.json");
  const calls = [];
  const previewRunner = async (options) => {
    calls.push(options);
    return {
      ok: true,
      version: "mse-25.31",
      operation: "preview-network-quality-uplift",
      readOnly: true,
      writes: false,
      destructive: false,
      planFingerprint: FP_A,
      minimumWords: 130,
      summary: { pageActionCount: 3 },
      operatorSummary: { pageCount: 3 },
      topPages: [{ siteSlug: "gien", pageSlug: "avis", operationTypes: ["enrich-body"] }],
      allPages: [
        { siteSlug: "gien", pageSlug: "avis", operationTypes: ["enrich-body"] },
        { siteSlug: "gien", pageSlug: "services", operationTypes: ["strengthen-meta-description"] },
        { siteSlug: "nevers", pageSlug: "avis", operationTypes: ["enrich-body"] },
      ],
      executionPayloads: [
        {
          key: "gien:avis",
          siteSlug: "gien",
          pageSlug: "avis",
          operations: [{ type: "enrich-body", preserveExisting: true }],
          bodyCopyPreview: { title: "Informations utiles", html: "<p>Gien.</p>" },
          completeOperationTypes: ["enrich-body"],
          incompleteOperationTypes: [],
          payloadComplete: true,
        },
        {
          key: "gien:services",
          siteSlug: "gien",
          pageSlug: "services",
          operations: [{ type: "strengthen-meta-description" }],
          bodyCopyPreview: null,
          completeOperationTypes: [],
          incompleteOperationTypes: ["strengthen-meta-description"],
          payloadComplete: false,
        },
        {
          key: "nevers:avis",
          siteSlug: "nevers",
          pageSlug: "avis",
          operations: [{ type: "enrich-body", preserveExisting: true }],
          bodyCopyPreview: { title: "Informations utiles", html: "<p>Nevers.</p>" },
          completeOperationTypes: ["enrich-body"],
          incompleteOperationTypes: [],
          payloadComplete: true,
        },
      ],
      manualReviewNeeded: [],
    };
  };

  const result = await run({
    backendOrigin: "http://127.0.0.1:4000/",
    tenantSlug: "mondescale",
    minimumWords: 130,
    topPages: 1,
    output,
    emitOutput: false,
    previewRunner,
    repositoryReader: () => ({ branch: EXPECTED_BRANCH, head: "1".repeat(40), dirty: false }),
  });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].emitOutput, false);
  assert.equal(calls[0].includeAllPages, true);
  assert.equal(calls[0].backendOrigin, "http://127.0.0.1:4000");
  assert.equal(calls[0].tenantSlug, "mondescale");
  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.destructive, false);
  assert.equal(result.planFingerprint, FP_A);
  assert.equal(result.reportPath, output);
  assert.equal(result.candidatePageCount, 3);
  assert.equal(result.executionPayloadAudit.completePayloadCount, 2);
  assert.equal(result.executionPayloadAudit.incompletePayloadCount, 1);
  assert.deepEqual(result.context, {
    backendOrigin: "http://127.0.0.1:4000",
    tenantSlug: "mondescale",
    minimumWords: 130,
    topPages: 1,
  });

  const report = JSON.parse(fs.readFileSync(output, "utf8"));
  assert.equal(report.readOnly, true);
  assert.equal(report.writes, false);
  assert.equal(report.destructive, false);
  assert.equal(report.planFingerprint, FP_A);
  assert.equal(report.determinism.verified, true);
  assert.equal(report.determinism.previewCount, 2);
  assert.equal(report.determinism.executionPayloadsVerified, true);
  assert.equal(report.repository.branch, EXPECTED_BRANCH);
  assert.equal(report.preview.topPages.length, 1);
  assert.equal(report.preview.allPages.length, 3);
  assert.equal(report.preview.executionPayloads.length, 3);
  assert.deepEqual(report.context, result.context);
});
