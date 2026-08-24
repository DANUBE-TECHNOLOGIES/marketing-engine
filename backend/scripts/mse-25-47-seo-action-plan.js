#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: qualify } = require("./mse-25-47-seo-qualify");
const { buildSeoActionPlan } = require("../src/modules/minisite-semantic-engine/seo-action-plan");

async function run() {
  const qualification = await qualify();
  const report = buildSeoActionPlan(qualification);
  const reportDir = process.env.MSE_25_47_REPORT_DIR || process.env.MSE_25_40_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-47-seo-action-plan-${report.actionPlanFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, readOnly: true, writes: false, reportPath, actionPlanFingerprint: report.actionPlanFingerprint, summary: report.summary }, null, 2));
  return report;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_47_ACTION_PLAN_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
