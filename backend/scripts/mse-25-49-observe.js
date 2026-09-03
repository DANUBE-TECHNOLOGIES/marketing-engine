#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: ingestSearchConsole } = require("./mse-25-48-search-console-ingest");
const { run: runLifecycle } = require("./mse-25-49-search-demand-lifecycle");
const { run: certifyLifecycle } = require("./mse-25-49-certify");
const { fingerprint } = require("../src/modules/minisite-semantic-engine/search-demand-evidence");

async function run({
  ingest = ingestSearchConsole,
  lifecycleRunner = runLifecycle,
  certifier = certifyLifecycle,
  emitOutput = true,
} = {}) {
  const previousAnalyticsFile = process.env.MSE_25_48_SEARCH_ANALYTICS_FILE;
  const ingestion = await ingest({ emitOutput: false });
  process.env.MSE_25_48_SEARCH_ANALYTICS_FILE = ingestion.reportPath;

  try {
    const lifecycleResult = await lifecycleRunner({ emitOutput: false });
    const certification = await certifier({ lifecycle: lifecycleResult.lifecycle, emitOutput: false });

    const reportDir = process.env.MSE_25_49_REPORT_DIR || process.env.MSE_25_48_REPORT_DIR || "/tmp";
    fs.mkdirSync(reportDir, { recursive: true });

    const observation = {
      type: "mse-25.49-search-demand-observation",
      generatedAt: new Date().toISOString(),
      readOnly: true,
      writes: false,
      property: ingestion.analytics?.siteUrl || process.env.SEARCH_CONSOLE_SITE_URL || null,
      analyticsReportPath: ingestion.reportPath,
      analyticsFingerprint: ingestion.analytics?.analyticsFingerprint || null,
      analyticsRowCount: Number(ingestion.analytics?.rowCount || 0),
      lifecycleReportPath: lifecycleResult.reportPath,
      lifecycleFingerprint: lifecycleResult.lifecycleFingerprint,
      lifecycleState: lifecycleResult.lifecycleState,
      dataState: lifecycleResult.dataState,
      certificationReportPath: certification.reportPath,
      certified: certification.certification?.certified === true,
      summary: lifecycleResult.summary,
      policy: lifecycleResult.lifecycle.policy,
    };
    const observationFingerprint = fingerprint(observation);
    const reportPath = path.join(reportDir, `mse-25-49-observation-${observationFingerprint.slice(0, 12)}.json`);
    fs.writeFileSync(reportPath, `${JSON.stringify({ ...observation, observationFingerprint }, null, 2)}\n`, { mode: 0o600 });

    const output = {
      ok: observation.certified,
      readOnly: true,
      writes: false,
      reportPath,
      observationFingerprint,
      property: observation.property,
      analyticsRowCount: observation.analyticsRowCount,
      dataState: observation.dataState,
      lifecycleState: observation.lifecycleState,
      certified: observation.certified,
      summary: observation.summary,
      analyticsReportPath: observation.analyticsReportPath,
      lifecycleReportPath: observation.lifecycleReportPath,
      certificationReportPath: observation.certificationReportPath,
    };
    if (emitOutput) console.log(JSON.stringify(output, null, 2));
    return output;
  } finally {
    if (previousAnalyticsFile === undefined) delete process.env.MSE_25_48_SEARCH_ANALYTICS_FILE;
    else process.env.MSE_25_48_SEARCH_ANALYTICS_FILE = previousAnalyticsFile;
  }
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    readOnly: true,
    writes: false,
    error: error.code || "MSE_25_49_OBSERVATION_FAILED",
    message: error.message,
  }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
