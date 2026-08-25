"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../scripts/mse-25-52-observe");

function prioritization(overrides = {}) {
  return {
    reportPath: "/tmp/prioritization.json",
    prioritizationFingerprint: "p1",
    readOnly: true,
    writes: false,
    publicWrites: false,
    dataState: "NO_DATA_YET",
    lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
    summary: { prioritizedReviewItemCount: 0, highPriorityCount: 0, mediumPriorityCount: 0, lowPriorityCount: 0, executableCount: 0, automaticWriteCount: 0 },
    policy: { rankingIsAdvisoryOnly: true, humanReviewRequired: true, automaticWrites: false },
    items: [],
    ...overrides,
  };
}

test("end-to-end observation remains read-only and certified", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-52-"));
  const old = process.env.MSE_25_52_REPORT_DIR;
  process.env.MSE_25_52_REPORT_DIR = dir;
  try {
    const result = await run({
      prioritizer: async () => prioritization(),
      certifier: () => ({ certified: true, certificationFingerprint: "c1", reportPath: path.join(dir, "cert.json") }),
      emitOutput: false,
    });
    assert.equal(result.ok, true);
    assert.equal(result.readOnly, true);
    assert.equal(result.writes, false);
    assert.equal(result.executableCount, 0);
    assert.equal(result.automaticWriteCount, 0);
    assert.equal(fs.existsSync(result.reportPath), true);
  } finally {
    if (old === undefined) delete process.env.MSE_25_52_REPORT_DIR; else process.env.MSE_25_52_REPORT_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("prioritized items remain advisory in observation", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-52-"));
  const old = process.env.MSE_25_52_REPORT_DIR;
  process.env.MSE_25_52_REPORT_DIR = dir;
  try {
    const result = await run({
      prioritizer: async () => prioritization({ summary: { prioritizedReviewItemCount: 2, highPriorityCount: 1, mediumPriorityCount: 1, lowPriorityCount: 0, executableCount: 0, automaticWriteCount: 0 } }),
      certifier: () => ({ certified: true, certificationFingerprint: "c2", reportPath: path.join(dir, "cert.json") }),
      emitOutput: false,
    });
    assert.equal(result.prioritizedReviewItemCount, 2);
    assert.equal(result.highPriorityCount, 1);
    assert.equal(result.certified, true);
    assert.equal(result.executableCount, 0);
  } finally {
    if (old === undefined) delete process.env.MSE_25_52_REPORT_DIR; else process.env.MSE_25_52_REPORT_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
