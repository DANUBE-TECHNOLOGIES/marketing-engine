const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { hydrateLifecycleFromObservation, run } = require("../scripts/mse-25-51-review-queue");

function write(dir, name, value) {
  const file = path.join(dir, name);
  fs.writeFileSync(file, JSON.stringify(value));
  return file;
}

test("runner hydrates eligible lifecycle signals through actual MSE-25.50 output contract", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-51-"));
  const lifecyclePath = write(dir, "lifecycle.json", {
    dataState: "DATA_AVAILABLE",
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
    signals: [{
      key: "gien|ticketing",
      siteSlug: "gien",
      intent: "ticketing",
      humanReviewEligible: true,
      evidenceLevel: "HIGH",
    }],
  });
  const mse49Path = write(dir, "mse49.json", {
    certified: true,
    lifecycleReportPath: lifecyclePath,
    observationFingerprint: "obs49",
    dataState: "DATA_AVAILABLE",
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
  });

  // Runtime contract from mse-25-50-observe-history.js:
  // output.reportPath -> MSE-25.50 final report
  // output.observationReportPath -> MSE-25.49 observation
  const observation = {
    certified: true,
    writes: false,
    automaticWriteCount: 0,
    reportPath: write(dir, "mse50-final.json", {
      certified: true,
      observationReportPath: mse49Path,
    }),
    observationReportPath: mse49Path,
    dataState: "DATA_AVAILABLE",
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
  };

  const old = process.env.MSE_25_51_REPORT_DIR;
  process.env.MSE_25_51_REPORT_DIR = dir;
  try {
    const hydrated = hydrateLifecycleFromObservation(observation);
    assert.equal(hydrated.lifecycle.signals.length, 1);
    assert.equal(hydrated.mse49Report.lifecycleReportPath, lifecyclePath);

    const result = await run({ observer: async () => observation, emitOutput: false });
    assert.equal(result.summary.reviewItemCount, 1);
    assert.equal(result.items[0].key, "gien|ticketing");
    assert.equal(result.items[0].reviewOnly, true);
    assert.equal(result.items[0].executable, false);
    assert.equal(result.items[0].automaticWrite, false);
    assert.equal(result.sourceMse50ReportPath, observation.reportPath);
    assert.equal(result.sourceMse49ReportPath, mse49Path);
    assert.equal(result.sourceLifecycleReportPath, lifecyclePath);
  } finally {
    if (old === undefined) delete process.env.MSE_25_51_REPORT_DIR;
    else process.env.MSE_25_51_REPORT_DIR = old;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("runner fails closed when an evidence-chain report is missing", () => {
  assert.throws(
    () => hydrateLifecycleFromObservation({ observationReportPath: "/definitely/missing.json" }),
    /SOURCE_REPORT_MISSING/,
  );
});
