#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: previewNetwork } = require("./mse-25-40-network-preview");
const { qualifySeoSignals } = require("../src/modules/minisite-semantic-engine/seo-signal-qualification");
const { buildSeoActionPlan } = require("../src/modules/minisite-semantic-engine/seo-action-plan");
const { buildInternalLinkEvidence } = require("../src/modules/minisite-semantic-engine/internal-link-evidence");

async function run() {
  const preview = await previewNetwork({ emitOutput: false });
  const qualification = qualifySeoSignals(preview);
  const actionPlan = buildSeoActionPlan(qualification);
  const report = buildInternalLinkEvidence(preview, actionPlan);
  const reportDir = process.env.MSE_25_47_REPORT_DIR || process.env.MSE_25_40_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-47-internal-link-evidence-${report.evidenceFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ok: true, readOnly: true, writes: false, reportPath, evidenceFingerprint: report.evidenceFingerprint, summary: report.summary }, null, 2));
  return report;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_47_LINK_EVIDENCE_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
