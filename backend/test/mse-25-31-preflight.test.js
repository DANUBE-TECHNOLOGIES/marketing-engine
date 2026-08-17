"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  EXPECTED_BRANCH,
  assertDeterministicPreview,
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
      topPages: [{ siteSlug: "gien", pageSlug: "avis" }],
      allPages: [
        { siteSlug: "gien", pageSlug: "avis" },
        { siteSlug: "gien", pageSlug: "services" },
        { siteSlug: "nevers", pageSlug: "avis" },
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
  assert.equal(report.repository.branch, EXPECTED_BRANCH);
  assert.equal(report.preview.topPages.length, 1);
  assert.equal(report.preview.allPages.length, 3);
  assert.deepEqual(report.context, result.context);
});
