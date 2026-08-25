"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../scripts/mse-25-49-observe");

function lifecycleFixture() {
  return {
    lifecycleFingerprint: "life".padEnd(64, "0"),
    lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
    dataState: "NO_DATA_YET",
    readOnly: true,
    writes: false,
    noDataIsNotNoDemand: true,
    policy: {
      automaticWrites: false,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      noAutomaticPublication: true,
      noDemandInferenceFromMissingData: true,
      persistentDemandRequiredBeforeHumanReview: true,
      minimumConsecutiveQualifyingSnapshots: 2,
      singleSnapshotSpikeIsInsufficient: true,
    },
    summary: {
      signalCount: 56,
      unknownNoDataCount: 56,
      humanReviewEligibleCount: 0,
      automaticWriteCount: 0,
    },
  };
}

test("observation composes ingestion lifecycle and certification into one machine-readable result", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-49-observe-"));
  const old49 = process.env.MSE_25_49_REPORT_DIR;
  const oldAnalytics = process.env.MSE_25_48_SEARCH_ANALYTICS_FILE;
  process.env.MSE_25_49_REPORT_DIR = dir;
  try {
    const analyticsPath = path.join(dir, "analytics.json");
    fs.writeFileSync(analyticsPath, JSON.stringify({ rowCount: 0 }));
    const life = lifecycleFixture();
    const result = await run({
      emitOutput: false,
      ingest: async ({ emitOutput }) => {
        assert.equal(emitOutput, false);
        return {
          reportPath: analyticsPath,
          analytics: { siteUrl: "sc-domain:mondescale.com", analyticsFingerprint: "analytics", rowCount: 0 },
        };
      },
      lifecycleRunner: async ({ emitOutput }) => {
        assert.equal(emitOutput, false);
        assert.equal(process.env.MSE_25_48_SEARCH_ANALYTICS_FILE, analyticsPath);
        const reportPath = path.join(dir, "lifecycle.json");
        fs.writeFileSync(reportPath, JSON.stringify(life));
        return { lifecycle: life, reportPath, lifecycleFingerprint: life.lifecycleFingerprint, lifecycleState: life.lifecycleState, dataState: life.dataState, summary: life.summary };
      },
      certifier: async ({ lifecycle, emitOutput }) => {
        assert.equal(emitOutput, false);
        assert.equal(lifecycle.lifecycleFingerprint, life.lifecycleFingerprint);
        const reportPath = path.join(dir, "certification.json");
        fs.writeFileSync(reportPath, JSON.stringify({ certified: true }));
        return { reportPath, certification: { certified: true } };
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.readOnly, true);
    assert.equal(result.writes, false);
    assert.equal(result.analyticsRowCount, 0);
    assert.equal(result.lifecycleState, "WAITING_FOR_SEARCH_DEMAND_DATA");
    assert.equal(result.certified, true);
    assert.equal(fs.existsSync(result.reportPath), true);
    const saved = JSON.parse(fs.readFileSync(result.reportPath, "utf8"));
    assert.equal(saved.policy.minimumConsecutiveQualifyingSnapshots, 2);
    assert.equal(saved.summary.automaticWriteCount, 0);
  } finally {
    if (old49 === undefined) delete process.env.MSE_25_49_REPORT_DIR;
    else process.env.MSE_25_49_REPORT_DIR = old49;
    if (oldAnalytics === undefined) delete process.env.MSE_25_48_SEARCH_ANALYTICS_FILE;
    else process.env.MSE_25_48_SEARCH_ANALYTICS_FILE = oldAnalytics;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("observation restores the caller analytics environment", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-49-observe-"));
  const old49 = process.env.MSE_25_49_REPORT_DIR;
  const oldAnalytics = process.env.MSE_25_48_SEARCH_ANALYTICS_FILE;
  process.env.MSE_25_49_REPORT_DIR = dir;
  process.env.MSE_25_48_SEARCH_ANALYTICS_FILE = "/preexisting/analytics.json";
  try {
    const analyticsPath = path.join(dir, "analytics.json");
    fs.writeFileSync(analyticsPath, "{}");
    const life = lifecycleFixture();
    await run({
      emitOutput: false,
      ingest: async () => ({ reportPath: analyticsPath, analytics: { siteUrl: "sc-domain:mondescale.com", rowCount: 0 } }),
      lifecycleRunner: async () => ({ lifecycle: life, reportPath: path.join(dir, "life.json"), lifecycleFingerprint: life.lifecycleFingerprint, lifecycleState: life.lifecycleState, dataState: life.dataState, summary: life.summary }),
      certifier: async () => ({ reportPath: path.join(dir, "cert.json"), certification: { certified: true } }),
    });
    assert.equal(process.env.MSE_25_48_SEARCH_ANALYTICS_FILE, "/preexisting/analytics.json");
  } finally {
    if (old49 === undefined) delete process.env.MSE_25_49_REPORT_DIR;
    else process.env.MSE_25_49_REPORT_DIR = old49;
    if (oldAnalytics === undefined) delete process.env.MSE_25_48_SEARCH_ANALYTICS_FILE;
    else process.env.MSE_25_48_SEARCH_ANALYTICS_FILE = oldAnalytics;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
