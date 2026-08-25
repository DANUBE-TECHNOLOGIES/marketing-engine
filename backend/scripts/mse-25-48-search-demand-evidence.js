#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: previewNetwork } = require("./mse-25-40-network-preview");
const { buildSearchDemandEvidence } = require("../src/modules/minisite-semantic-engine/search-demand-evidence");

function loadOptional(file) {
  if (!file) return null;
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) return null;
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

async function run() {
  const preview = await previewNetwork({ emitOutput: false });
  const analytics = loadOptional(process.env.MSE_25_48_SEARCH_ANALYTICS_FILE);
  const report = buildSearchDemandEvidence({ preview, analytics });
  const reportDir = process.env.MSE_25_48_REPORT_DIR || process.env.MSE_25_47_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-48-search-demand-evidence-${report.evidenceFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    ok: true,
    readOnly: true,
    writes: false,
    reportPath,
    evidenceFingerprint: report.evidenceFingerprint,
    sourceAnalyticsFingerprint: report.sourceAnalyticsFingerprint,
    analyticsProvided: report.analyticsProvided,
    analyticsInputState: report.analyticsInputState,
    analyticsAvailable: report.analyticsAvailable,
    analyticsRowCount: report.analyticsRowCount,
    dataState: report.dataState,
    lifecycleState: report.lifecycleState,
    demandConclusion: report.demandConclusion,
    noDataIsNotNoDemand: report.noDataIsNotNoDemand,
    summary: report.summary,
  }, null, 2));
  return report;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_48_SEARCH_DEMAND_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { loadOptional, run };
