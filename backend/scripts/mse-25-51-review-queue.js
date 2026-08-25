#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: observeHistory } = require("./mse-25-50-observe-history");
const { buildSearchDemandReviewQueue } = require("../src/modules/minisite-semantic-engine/search-demand-review-queue");

function readJson(file) {
  if (!file || !fs.existsSync(file)) throw new Error(`MSE_25_51_SOURCE_REPORT_MISSING:${file || "null"}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function hydrateLifecycleFromObservation(observation) {
  if (!observation) throw new Error("MSE_25_51_OBSERVATION_REQUIRED");

  // The end-to-end MSE-25.50 runner returns:
  // - reportPath: its own final MSE-25.50 observation report
  // - observationReportPath: the MSE-25.49 observation report
  // The MSE-25.49 report is therefore the direct source for lifecycleReportPath.
  const mse50Report = observation.reportPath ? readJson(observation.reportPath) : null;
  const mse49Path = observation.observationReportPath || mse50Report?.observationReportPath || null;
  const mse49Report = readJson(mse49Path);
  const lifecyclePath = mse49Report.lifecycleReportPath;
  const lifecycle = readJson(lifecyclePath);

  return {
    observation: {
      ...observation,
      observationFingerprint: observation.observationFingerprint || mse49Report.observationFingerprint || null,
      dataState: observation.dataState || mse49Report.dataState || lifecycle.dataState || null,
      lifecycleState: observation.lifecycleState || mse49Report.lifecycleState || lifecycle.lifecycleState || null,
      certified:
        observation.certified === true &&
        (mse50Report ? mse50Report.certified === true : true) &&
        mse49Report.certified === true,
      lifecycle,
    },
    lifecycle,
    mse50Report,
    mse49Report,
    mse49Path,
    lifecyclePath,
  };
}

async function run({ observer = observeHistory, emitOutput = true } = {}) {
  const reportDir = process.env.MSE_25_51_REPORT_DIR || process.env.MSE_25_50_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const observation = await observer({ emitOutput: false });
  const hydrated = hydrateLifecycleFromObservation(observation);
  const queue = buildSearchDemandReviewQueue({ observation: hydrated.observation });
  const reportPath = path.join(reportDir, `mse-25-51-review-queue-${queue.queueFingerprint.slice(0, 12)}.json`);
  const report = {
    ...queue,
    sourceMse50ReportPath: observation.reportPath || null,
    sourceMse49ReportPath: hydrated.mse49Path || null,
    sourceLifecycleReportPath: hydrated.lifecyclePath || null,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: true, ...report, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_51_REVIEW_QUEUE_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run, hydrateLifecycleFromObservation, readJson };
