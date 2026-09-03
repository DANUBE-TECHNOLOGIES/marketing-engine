#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: observeReviewQueue } = require("./mse-25-51-observe");
const { buildSearchDemandReviewPrioritization } = require("../src/modules/minisite-semantic-engine/search-demand-review-prioritization");

function readJson(file) {
  if (!file || !fs.existsSync(file)) throw new Error(`MSE_25_52_SOURCE_REPORT_MISSING:${file || "null"}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function run({ observer = observeReviewQueue, emitOutput = true } = {}) {
  const reportDir = process.env.MSE_25_52_REPORT_DIR || process.env.MSE_25_51_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const observation = await observer({ emitOutput: false });
  if (observation.certified !== true || observation.writes !== false || Number(observation.executableCount || 0) !== 0) {
    throw new Error("MSE_25_52_UNSAFE_MSE_25_51_OBSERVATION");
  }
  const queue = readJson(observation.queueReportPath);
  const lifecycle = readJson(queue.sourceLifecycleReportPath);
  const prioritization = buildSearchDemandReviewPrioritization({ queue, lifecycle });
  const reportPath = path.join(reportDir, `mse-25-52-prioritization-${prioritization.prioritizationFingerprint.slice(0, 12)}.json`);
  const report = {
    ...prioritization,
    sourceMse51ObservationReportPath: observation.reportPath || null,
    sourceQueueReportPath: observation.queueReportPath || null,
    sourceLifecycleReportPath: queue.sourceLifecycleReportPath || null,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: true, ...report, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_52_PRIORITIZATION_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run, readJson };
