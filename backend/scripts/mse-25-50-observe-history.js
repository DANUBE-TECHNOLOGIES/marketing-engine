#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: observeDemand } = require("./mse-25-49-observe");
const { run: runHistory } = require("./mse-25-50-search-demand-history");
const { run: certifyHistory } = require("./mse-25-50-certify");
const { buildHistoryTrendReport } = require("../src/modules/minisite-semantic-engine/search-demand-history-trend");
const { fingerprint } = require("../src/modules/minisite-semantic-engine/search-demand-evidence");

async function run({ observer = observeDemand, historyRunner = runHistory, certifier = certifyHistory, emitOutput = true } = {}) {
  const reportDir = process.env.MSE_25_50_REPORT_DIR || process.env.MSE_25_49_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });

  const previous49 = process.env.MSE_25_49_REPORT_DIR;
  const previous48 = process.env.MSE_25_48_REPORT_DIR;
  process.env.MSE_25_49_REPORT_DIR = reportDir;
  process.env.MSE_25_48_REPORT_DIR = reportDir;

  try {
    const observation = await observer({ emitOutput: false });
    const historyResult = historyRunner({ reportDir, emitOutput: false });
    const trend = buildHistoryTrendReport({ history: historyResult.history });
    const certification = certifier({ history: historyResult.history, reportDir, emitOutput: false });

    const trendReportPath = path.join(reportDir, `mse-25-50-history-trend-${trend.trendFingerprint.slice(0, 12)}.json`);
    fs.writeFileSync(trendReportPath, `${JSON.stringify(trend, null, 2)}\n`, { mode: 0o600 });

    const result = {
      type: "mse-25.50-search-demand-history-observation",
      generatedAt: new Date().toISOString(),
      readOnly: true,
      writes: false,
      observationReportPath: observation.reportPath,
      historyReportPath: historyResult.reportPath,
      trendReportPath,
      certificationReportPath: certification.reportPath,
      observationFingerprint: observation.observationFingerprint,
      historyFingerprint: historyResult.historyFingerprint,
      trendFingerprint: trend.trendFingerprint,
      certificationFingerprint: certification.certificationFingerprint,
      snapshotCount: historyResult.snapshotCount,
      dataState: historyResult.latest?.dataState || null,
      lifecycleState: historyResult.latest?.lifecycleState || null,
      trend: trend.trend,
      reviewRequired: trend.reviewRequired,
      certified: certification.certification?.certified === true,
      automaticWriteCount: Number(historyResult.latest?.automaticWriteCount || 0),
      policy: {
        observationOnly: true,
        certifiedHistoryRequired: true,
        humanReviewRequiredBeforeSeoExecution: true,
        noAutomaticPageCreation: true,
        noAutomaticContentWrite: true,
        noAutomaticPublication: true,
        automaticWrites: false,
      },
    };
    const runFingerprint = fingerprint(result);
    const reportPath = path.join(reportDir, `mse-25-50-observation-${runFingerprint.slice(0, 12)}.json`);
    fs.writeFileSync(reportPath, `${JSON.stringify({ ...result, runFingerprint }, null, 2)}\n`, { mode: 0o600 });

    const output = { ok: result.certified, ...result, reportPath, runFingerprint };
    if (emitOutput) console.log(JSON.stringify(output, null, 2));
    return output;
  } finally {
    if (previous49 === undefined) delete process.env.MSE_25_49_REPORT_DIR;
    else process.env.MSE_25_49_REPORT_DIR = previous49;
    if (previous48 === undefined) delete process.env.MSE_25_48_REPORT_DIR;
    else process.env.MSE_25_48_REPORT_DIR = previous48;
  }
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_50_OBSERVATION_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
