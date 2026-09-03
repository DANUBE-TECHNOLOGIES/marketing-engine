"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../scripts/mse-25-55-editorial-mandate");

function source(dir, decision = "REFINE_EXISTING_PAGE", overrides = {}) {
  const file = path.join(dir, "mse-25-54.json");
  fs.writeFileSync(file, JSON.stringify({
    type: "MSE_25_54_HUMAN_SEO_REVIEW_DECISION_REPORT", certified: true,
    readOnly: true, writes: false, publicWrites: false,
    sourcePacketFingerprint: "packet-fp", chainFingerprint: "decision-chain-fp",
    summary: { executableCount: 0, automaticWriteCount: 0 },
    decision: {
      humanDecision: true, reviewOnly: true, executable: false, automaticWrite: false,
      decision, nextStep: decision === "REFINE_EXISTING_PAGE" ? "PREPARE_NON_EXECUTABLE_EDITORIAL_MANDATE" : "NO_CHANGE_REQUESTED",
      decisionFingerprint: "decision-fp", sourcePacketFingerprint: "packet-fp",
      siteSlug: "gien", intent: "ticketing", query: "billet avion gien", page: "/services",
      priority: "HIGH_REVIEW_PRIORITY", priorityScore: 90, evidenceLevel: "HIGH", lifecycleStatus: "PERSISTING",
    }, ...overrides,
  }));
  return file;
}

function env(values) {
  const before = {};
  for (const [key, value] of Object.entries(values)) { before[key] = process.env[key]; process.env[key] = value; }
  return () => { for (const [key, value] of Object.entries(before)) value === undefined ? delete process.env[key] : process.env[key] = value; };
}

test("runner seals a certified non executable editorial mandate", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-55-"));
  const restore = env({ MSE_25_55_SOURCE_REPORT: source(dir), MSE_25_55_REPORT_DIR: dir });
  try {
    const result = await run({ emitOutput: false });
    assert.equal(result.certified, true);
    assert.equal(result.writes, false);
    assert.equal(result.publicWrites, false);
    assert.equal(result.summary.executableCount, 0);
    assert.equal(result.summary.automaticWriteCount, 0);
    assert.equal(result.mandate.constraints.pageCreationAllowed, false);
    assert.equal(result.mandate.constraints.websiteDesignerMutationAllowed, false);
    assert.equal(result.mandate.constraints.humanApprovalRequiredBeforeAnyFutureMutation, true);
    assert.equal(fs.existsSync(result.reportPath), true);
    assert.equal((fs.statSync(result.reportPath).mode & 0o777), 0o600);
  } finally { restore(); }
});

test("runner refuses KEEP_AS_IS because no editorial work was authorized", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-55-"));
  const restore = env({ MSE_25_55_SOURCE_REPORT: source(dir, "KEEP_AS_IS"), MSE_25_55_REPORT_DIR: dir });
  try { await assert.rejects(() => run({ emitOutput: false }), /DECISION_NOT_ELIGIBLE/); } finally { restore(); }
});

test("runner refuses writable source chain", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-55-"));
  const restore = env({ MSE_25_55_SOURCE_REPORT: source(dir, "REFINE_EXISTING_PAGE", { writes: true }), MSE_25_55_REPORT_DIR: dir });
  try { await assert.rejects(() => run({ emitOutput: false }), /SOURCE_CERTIFICATION_FAILED/); } finally { restore(); }
});
