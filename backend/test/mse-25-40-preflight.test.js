"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const os = require("node:os");
const path = require("node:path");
const fs = require("node:fs");
const { run, EXPECTED_BRANCH } = require("../scripts/mse-25-40-preflight");

function preview(fingerprint = "a".repeat(64)) {
  return {
    version: "mse-25.40",
    readOnly: true,
    writes: false,
    destructive: false,
    planFingerprint: fingerprint,
    policy: {
      doorwayGuard: true,
      locationExpansion: false,
      preferExistingPages: true,
      newPageEvidenceGate: true,
      autoCreatePages: false,
      autoPublishPages: false,
      automaticWrites: false,
    },
    summary: { agenciesProcessed: 7, semanticGapCount: 12, automaticWriteCount: 0 },
    excludedSites: [],
  };
}

test("preflight accepts two identical read-only semantic previews", async () => {
  const file = path.join(os.tmpdir(), `mse-25-40-preflight-${Date.now()}.json`);
  const result = await run({
    output: file,
    emitOutput: false,
    repositoryReader: () => ({ branch: EXPECTED_BRANCH, head: "1".repeat(40), dirty: false }),
    previewRunner: async () => preview(),
  });
  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.planFingerprint, "a".repeat(64));
  const persisted = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(persisted.determinism.verified, true);
  assert.equal(persisted.safety.verified, true);
  assert.equal(persisted.safety.newPageEvidenceGate, true);
  fs.unlinkSync(file);
});

test("preflight refuses another branch or dirty worktree", async () => {
  await assert.rejects(() => run({ emitOutput: false, repositoryReader: () => ({ branch: "main", head: "1".repeat(40), dirty: false }), previewRunner: async () => preview() }), { code: "MSE_25_40_BRANCH_MISMATCH" });
  await assert.rejects(() => run({ emitOutput: false, repositoryReader: () => ({ branch: EXPECTED_BRANCH, head: "1".repeat(40), dirty: true }), previewRunner: async () => preview() }), { code: "MSE_25_40_DIRTY_WORKTREE" });
});

test("preflight refuses non-determinism and any disabled semantic safety guard", async () => {
  let call = 0;
  await assert.rejects(() => run({ emitOutput: false, repositoryReader: () => ({ branch: EXPECTED_BRANCH, head: "1".repeat(40), dirty: false }), previewRunner: async () => preview((++call === 1 ? "a" : "b").repeat(64)) }), { code: "MSE_25_40_NON_DETERMINISTIC_PREVIEW" });

  for (const mutation of [
    (unsafe) => { unsafe.policy.locationExpansion = true; },
    (unsafe) => { unsafe.policy.preferExistingPages = false; },
    (unsafe) => { unsafe.policy.newPageEvidenceGate = false; },
    (unsafe) => { unsafe.policy.automaticWrites = true; },
    (unsafe) => { unsafe.summary.automaticWriteCount = 1; },
  ]) {
    const unsafe = preview();
    mutation(unsafe);
    await assert.rejects(() => run({ emitOutput: false, repositoryReader: () => ({ branch: EXPECTED_BRANCH, head: "1".repeat(40), dirty: false }), previewRunner: async () => unsafe }), { code: "MSE_25_40_SEMANTIC_SAFETY_GUARD_DISABLED" });
  }
});
