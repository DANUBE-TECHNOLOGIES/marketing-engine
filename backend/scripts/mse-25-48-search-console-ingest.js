#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { fetchSearchAnalytics } = require("../src/modules/minisite-semantic-engine/search-console-analytics");

async function run() {
  const analytics = await fetchSearchAnalytics({
    siteUrl: process.env.SEARCH_CONSOLE_SITE_URL,
    accessToken: process.env.SEARCH_CONSOLE_ACCESS_TOKEN,
    startDate: process.env.MSE_25_48_START_DATE,
    endDate: process.env.MSE_25_48_END_DATE,
    rowLimit: process.env.MSE_25_48_ROW_LIMIT,
  });
  const reportDir = process.env.MSE_25_48_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-48-search-console-analytics-${analytics.analyticsFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(analytics, null, 2)}\n`, { mode: 0o600 });
  console.log(JSON.stringify({
    ok: true,
    readOnly: true,
    writes: false,
    reportPath,
    analyticsFingerprint: analytics.analyticsFingerprint,
    siteUrl: analytics.siteUrl,
    startDate: analytics.startDate,
    endDate: analytics.endDate,
    rowCount: analytics.rowCount,
  }, null, 2));
  return { analytics, reportPath };
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_48_SEARCH_CONSOLE_INGEST_FAILED", message: error.message, details: error.details || {} }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
