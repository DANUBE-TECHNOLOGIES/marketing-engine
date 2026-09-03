"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../scripts/mse-25-53-decision-packets");

function write(dir, name, value) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}

test("runner consumes certified mse-25.52 prioritization report and emits advisory packets", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-53-"));
  const prioritizationPath = write(dir, "mse52-prioritization.json", {
    prioritizationFingerprint: "prio",
    dataState: "DATA_AVAILABLE",
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
    summary: { executableCount: 0, automaticWriteCount: 0 },
    items: [{ key: "gien|ticketing", siteSlug: "gien", intent: "ticketing", priority: "HIGH_REVIEW_PRIORITY", priorityScore: 90, evidenceLevel: "HIGH", impressions: 80, clicks: 3, position: 9, reviewOnly: true, executable: false, automaticWrite: false }],
  });
  const observation = { certified: true, writes: false, publicWrites: false, executableCount: 0, automaticWriteCount: 0, prioritizationReportPath: prioritizationPath, reportPath: path.join(dir, "mse52-observation.json") };
  const old = process.env.MSE_25_53_REPORT_DIR;
  process.env.MSE_25_53_REPORT_DIR = dir;
  try {
    const result = await run({ observer: async () => observation, emitOutput: false });
    assert.equal(result.summary.packetCount, 1);
    assert.equal(result.packets[0].humanDecisionRequired, true);
    assert.equal(result.packets[0].executable, false);
    assert.equal(result.sourcePrioritizationReportPath, prioritizationPath);
  } finally {
    if (old === undefined) delete process.env.MSE_25_53_REPORT_DIR; else process.env.MSE_25_53_REPORT_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runner fails closed when mse-25.52 prioritization report is missing", async () => {
  await assert.rejects(() => run({ observer: async () => ({ certified: true, writes: false, publicWrites: false, executableCount: 0, automaticWriteCount: 0, prioritizationReportPath: "/missing.json" }), emitOutput: false }), /SOURCE_REPORT_MISSING/);
});
