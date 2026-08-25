"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../scripts/mse-25-50-observe-history");

function certifiedObservation(dir) {
  const value = {
    type: "mse-25.49-search-demand-observation",
    generatedAt: "2026-08-25T10:00:00.000Z",
    readOnly: true,
    writes: false,
    property: "sc-domain:mondescale.com",
    analyticsFingerprint: "analytics",
    analyticsRowCount: 0,
    lifecycleFingerprint: "lifecycle",
    lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
    dataState: "NO_DATA_YET",
    certified: true,
    summary: { humanReviewEligibleCount: 0, automaticWriteCount: 0 },
    observationFingerprint: "observation",
  };
  const file = path.join(dir, "mse-25-49-observation-aaaaaaaaaaaa.json");
  fs.writeFileSync(file, JSON.stringify(value));
  return { value, file };
}

test("end-to-end runner remains read-only while certifying historical state", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-50-observe-"));
  const old = process.env.MSE_25_50_REPORT_DIR;
  process.env.MSE_25_50_REPORT_DIR = dir;
  const source = certifiedObservation(dir);
  try {
    const result = await run({
      observer: async () => ({
        ok: true,
        readOnly: true,
        writes: false,
        reportPath: source.file,
        observationFingerprint: source.value.observationFingerprint,
      }),
      emitOutput: false,
    });
    assert.equal(result.ok, true);
    assert.equal(result.readOnly, true);
    assert.equal(result.writes, false);
    assert.equal(result.snapshotCount, 1);
    assert.equal(result.dataState, "NO_DATA_YET");
    assert.equal(result.trend, "WAITING_FOR_DATA");
    assert.equal(result.reviewRequired, false);
    assert.equal(result.automaticWriteCount, 0);
    assert.equal(fs.existsSync(result.reportPath), true);
  } finally {
    if (old === undefined) delete process.env.MSE_25_50_REPORT_DIR;
    else process.env.MSE_25_50_REPORT_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runner exposes human review without converting it to an SEO write", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-50-review-"));
  const old = process.env.MSE_25_50_REPORT_DIR;
  process.env.MSE_25_50_REPORT_DIR = dir;
  try {
    const first = certifiedObservation(dir);
    const second = {
      ...first.value,
      generatedAt: "2026-09-01T10:00:00.000Z",
      observationFingerprint: "observation-2",
      analyticsFingerprint: "analytics-2",
      analyticsRowCount: 20,
      dataState: "DATA_AVAILABLE",
      lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
      summary: { humanReviewEligibleCount: 2, automaticWriteCount: 0 },
    };
    const secondFile = path.join(dir, "mse-25-49-observation-bbbbbbbbbbbb.json");
    fs.writeFileSync(secondFile, JSON.stringify(second));
    const result = await run({
      observer: async () => ({ ok: true, readOnly: true, writes: false, reportPath: secondFile, observationFingerprint: second.observationFingerprint }),
      emitOutput: false,
    });
    assert.equal(result.certified, true);
    assert.equal(result.trend, "DATA_APPEARED");
    assert.equal(result.reviewRequired, true);
    assert.equal(result.policy.automaticWrites, false);
    assert.equal(result.automaticWriteCount, 0);
  } finally {
    if (old === undefined) delete process.env.MSE_25_50_REPORT_DIR;
    else process.env.MSE_25_50_REPORT_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
