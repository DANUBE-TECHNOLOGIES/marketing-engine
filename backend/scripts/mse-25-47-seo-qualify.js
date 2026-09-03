#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: previewNetwork } = require("./mse-25-40-network-preview");
const { qualifySeoSignals } = require("../src/modules/minisite-semantic-engine/seo-signal-qualification");

async function run() {
  const preview = await previewNetwork({ emitOutput: false });
  const report = qualifySeoSignals(preview);
  const reportDir = process.env.MSE_25_47_REPORT_DIR || process.env.MSE_25_40_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-47-seo-qualification-${report.qualificationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, readOnly: true, writes: false, reportPath, qualificationFingerprint: report.qualificationFingerprint, summary: report.summary }, null, 2));
  return report;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_47_QUALIFICATION_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
