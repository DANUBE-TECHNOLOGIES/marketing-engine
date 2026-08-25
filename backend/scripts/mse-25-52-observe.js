#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: prioritize } = require("./mse-25-52-prioritize");
const { run: certify } = require("./mse-25-52-certify");
const { fingerprint } = require("../src/modules/minisite-semantic-engine/search-demand-review-prioritization");

async function run({ prioritizer = prioritize, certifier = certify, emitOutput = true } = {}) {
  const reportDir = process.env.MSE_25_52_REPORT_DIR || process.env.MSE_25_51_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const prioritization = await prioritizer({ emitOutput: false });
  const certification = certifier({ prioritization, reportDir, emitOutput: false });
  const result = {
    type: "MSE_25_52_REVIEW_PRIORITIZATION_OBSERVATION",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    publicWrites: false,
    prioritizationReportPath: prioritization.reportPath,
    certificationReportPath: certification.reportPath,
    prioritizationFingerprint: prioritization.prioritizationFingerprint,
    certificationFingerprint: certification.certificationFingerprint,
    certified: certification.certified === true,
    dataState: prioritization.dataState || null,
    lifecycleState: prioritization.lifecycleState || null,
    prioritizedReviewItemCount: Number(prioritization.summary?.prioritizedReviewItemCount || 0),
    highPriorityCount: Number(prioritization.summary?.highPriorityCount || 0),
    mediumPriorityCount: Number(prioritization.summary?.mediumPriorityCount || 0),
    lowPriorityCount: Number(prioritization.summary?.lowPriorityCount || 0),
    executableCount: Number(prioritization.summary?.executableCount || 0),
    automaticWriteCount: Number(prioritization.summary?.automaticWriteCount || 0),
    policy: prioritization.policy,
  };
  result.observationFingerprint = fingerprint(result);
  const reportPath = path.join(reportDir, `mse-25-52-observation-${result.observationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: result.certified, ...result, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_52_OBSERVATION_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
