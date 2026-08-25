"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { hydrateLifecycleFromObservation } = require("../scripts/mse-25-51-review-queue");

function write(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
  return file;
}

test("hydration follows mse-25.50 output -> mse-25.49 observation -> lifecycle", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-51-chain-"));
  try {
    const lifecyclePath = write(path.join(dir, "lifecycle.json"), {
      readOnly: true,
      writes: false,
      dataState: "NO_DATA_YET",
      lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
      signals: [],
    });

    const mse49Path = write(path.join(dir, "mse49.json"), {
      certified: true,
      observationFingerprint: "obs49",
      dataState: "NO_DATA_YET",
      lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
      lifecycleReportPath: lifecyclePath,
    });

    const mse50Path = write(path.join(dir, "mse50.json"), {
      certified: true,
      observationReportPath: mse49Path,
    });

    const output = {
      reportPath: mse50Path,
      observationReportPath: mse49Path,
      observationFingerprint: "obs50",
      certified: true,
      dataState: "NO_DATA_YET",
      lifecycleState: "WAITING_FOR_SEARCH_DEMAND_DATA",
    };

    const hydrated = hydrateLifecycleFromObservation(output);
    assert.equal(hydrated.mse49Path, mse49Path);
    assert.equal(hydrated.lifecyclePath, lifecyclePath);
    assert.equal(hydrated.observation.certified, true);
    assert.equal(hydrated.observation.lifecycle.signals.length, 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("hydration fails closed when the mse-25.49 source path is absent", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-51-chain-"));
  try {
    const mse50Path = write(path.join(dir, "mse50.json"), { certified: true });
    assert.throws(
      () => hydrateLifecycleFromObservation({ reportPath: mse50Path, certified: true }),
      /MSE_25_51_SOURCE_REPORT_MISSING:null/
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
