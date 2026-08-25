"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { findPreviousEvidence, run } = require("../scripts/mse-25-49-search-demand-lifecycle");

function evidence({ fingerprint, available = true, strength = "none", impressions = 0 } = {}) {
  return {
    evidenceFingerprint: fingerprint,
    readOnly: true,
    writes: false,
    analyticsAvailable: available,
    dataState: available ? "DATA_AVAILABLE" : "NO_DATA_YET",
    policy: { automaticWrites: false },
    signals: [{ siteSlug: "mondescale-test", agencyId: "a1", city: "Test", intentKey: "circuits", evidenceStrength: strength, impressions, clicks: 0, position: impressions ? 18 : 0 }],
  };
}

test("runner compares current evidence with explicit previous snapshot and writes only a report", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-49-"));
  const oldDir = process.env.MSE_25_49_REPORT_DIR;
  process.env.MSE_25_49_REPORT_DIR = dir;
  try {
    const result = await run({
      previousEvidence: evidence({ fingerprint: "previous", strength: "none" }),
      currentEvidence: evidence({ fingerprint: "current", strength: "medium", impressions: 40 }),
    });
    assert.equal(result.readOnly, true);
    assert.equal(result.writes, false);
    assert.equal(result.lifecycle.signals[0].transition, "NEW");
    assert.equal(result.lifecycle.summary.humanReviewEligibleCount, 1);
    assert.equal(result.lifecycle.summary.automaticWriteCount, 0);
    assert.equal(fs.existsSync(result.reportPath), true);
  } finally {
    if (oldDir === undefined) delete process.env.MSE_25_49_REPORT_DIR;
    else process.env.MSE_25_49_REPORT_DIR = oldDir;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runner preserves NO_DATA_YET as unknown when there is no previous snapshot", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-49-"));
  const oldDir = process.env.MSE_25_49_REPORT_DIR;
  process.env.MSE_25_49_REPORT_DIR = dir;
  try {
    const result = await run({ currentEvidence: evidence({ fingerprint: "current-no-data", available: false }) });
    assert.equal(result.lifecycle.lifecycleState, "WAITING_FOR_SEARCH_DEMAND_DATA");
    assert.equal(result.lifecycle.signals[0].transition, "UNKNOWN_NO_DATA");
    assert.equal(result.lifecycle.summary.humanReviewEligibleCount, 0);
  } finally {
    if (oldDir === undefined) delete process.env.MSE_25_49_REPORT_DIR;
    else process.env.MSE_25_49_REPORT_DIR = oldDir;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("previous snapshot discovery ignores the current evidence fingerprint", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-49-discovery-"));
  try {
    const previous = evidence({ fingerprint: "previous", strength: "weak", impressions: 10 });
    const current = evidence({ fingerprint: "current", strength: "medium", impressions: 40 });
    const previousFile = path.join(dir, "mse-25-48-search-demand-evidence-aaaaaaaaaaaa.json");
    const currentFile = path.join(dir, "mse-25-48-search-demand-evidence-bbbbbbbbbbbb.json");
    fs.writeFileSync(previousFile, JSON.stringify(previous));
    fs.writeFileSync(currentFile, JSON.stringify(current));
    const now = Date.now() / 1000;
    fs.utimesSync(previousFile, now - 10, now - 10);
    fs.utimesSync(currentFile, now, now);
    const found = findPreviousEvidence(dir, "current");
    assert.equal(found.snapshot.evidenceFingerprint, "previous");
    assert.equal(found.file, previousFile);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
