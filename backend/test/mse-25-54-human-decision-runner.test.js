"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../scripts/mse-25-54-human-decision");

function sourceReport(dir, overrides = {}) {
  const file = path.join(dir, "packets.json");
  fs.writeFileSync(file, JSON.stringify({
    readOnly: true, writes: false, publicWrites: false,
    packetFingerprint: "packet-fingerprint", sourcePrioritizationFingerprint: "priority-fingerprint",
    summary: { executableCount: 0, automaticWriteCount: 0 },
    packets: [{
      key: "gien:ticketing", siteSlug: "gien", intent: "ticketing", query: "billet avion gien", page: "/services",
      priority: "HIGH_REVIEW_PRIORITY", priorityScore: 90, evidenceLevel: "HIGH", impressions: 120, clicks: 8, position: 11,
      lifecycleStatus: "PERSISTING", decisionOptions: ["KEEP_AS_IS", "REFINE_EXISTING_PAGE", "REQUEST_MORE_EVIDENCE"],
      humanDecisionRequired: true, reviewOnly: true, executable: false, automaticWrite: false,
    }], ...overrides,
  }));
  return file;
}

function setEnv(values) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) value === undefined ? delete process.env[key] : process.env[key] = value;
  };
}

test("runner persists a certified immutable non executable decision report with sealed source chain", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-54-"));
  const restore = setEnv({
    MSE_25_54_SOURCE_REPORT: sourceReport(dir), MSE_25_54_PACKET_KEY: "gien:ticketing",
    MSE_25_54_DECISION: "REFINE_EXISTING_PAGE", MSE_25_54_REVIEWER: "seo-director",
    MSE_25_54_RATIONALE: "Persistent demand warrants editorial review.", MSE_25_54_REPORT_DIR: dir,
  });
  try {
    const result = await run({ emitOutput: false });
    assert.equal(result.certified, true);
    assert.equal(result.writes, false);
    assert.equal(result.publicWrites, false);
    assert.equal(result.summary.executableCount, 0);
    assert.equal(result.decision.websiteDesignerMutationAllowed, false);
    assert.equal(result.sourceCertification.certified, true);
    assert.equal(result.decisionCertification.certified, true);
    assert.equal(result.sourcePacketFingerprint, "packet-fingerprint");
    assert.equal(result.decision.sourcePacketFingerprint, result.sourcePacketFingerprint);
    assert.ok(result.chainFingerprint);
    assert.equal(fs.existsSync(result.reportPath), true);
    assert.equal((fs.statSync(result.reportPath).mode & 0o777), 0o600);
    await assert.rejects(() => run({ emitOutput: false }), /EEXIST/);
  } finally { restore(); }
});

test("runner fails closed when required human fields are missing", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-54-"));
  const restore = setEnv({ MSE_25_54_SOURCE_REPORT: sourceReport(dir), MSE_25_54_PACKET_KEY: "gien:ticketing", MSE_25_54_DECISION: "KEEP_AS_IS", MSE_25_54_REVIEWER: "", MSE_25_54_RATIONALE: "Existing coverage remains sufficient.", MSE_25_54_REPORT_DIR: dir });
  try { await assert.rejects(() => run({ emitOutput: false }), /REVIEWER_REQUIRED/); } finally { restore(); }
});

test("runner refuses an unsafe MSE-25.53 source before persistence", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-54-"));
  const restore = setEnv({ MSE_25_54_SOURCE_REPORT: sourceReport(dir, { writes: true }), MSE_25_54_PACKET_KEY: "gien:ticketing", MSE_25_54_DECISION: "KEEP_AS_IS", MSE_25_54_REVIEWER: "seo-director", MSE_25_54_RATIONALE: "Existing coverage remains sufficient.", MSE_25_54_REPORT_DIR: dir });
  try { await assert.rejects(() => run({ emitOutput: false }), /SOURCE_CERTIFICATION_FAILED/); } finally { restore(); }
});
