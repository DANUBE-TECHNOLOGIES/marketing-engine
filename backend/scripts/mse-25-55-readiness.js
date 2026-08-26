#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  discoverLatestHumanDecision,
  evaluateEditorialMandateReadiness,
  readJson,
} = require("../src/modules/minisite-semantic-engine/editorial-mandate-readiness");

function run({ emitOutput = true } = {}) {
  const decisionReportDir = process.env.MSE_25_54_REPORT_DIR || "/home/admin1/mse-25-54-reports";
  const reportDir = process.env.MSE_25_55_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });

  const decisionReportPath = process.env.MSE_25_55_SOURCE_REPORT || discoverLatestHumanDecision(decisionReportDir);
  const decisionReport = decisionReportPath ? readJson(decisionReportPath) : null;
  const readiness = evaluateEditorialMandateReadiness({ decisionReport, decisionReportPath });
  const reportPath = path.join(reportDir, `mse-25-55-readiness-${readiness.readinessFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(readiness, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: true, reportPath, ...readiness };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) {
  try { run(); }
  catch (error) {
    console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, publicWrites: false, error: "MSE_25_55_READINESS_FAILED", message: error.message }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { run };
