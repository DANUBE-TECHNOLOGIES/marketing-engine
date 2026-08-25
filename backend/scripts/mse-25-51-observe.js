#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: buildQueue } = require("./mse-25-51-review-queue");
const { certify } = require("./mse-25-51-certify");
const { fingerprint } = require("../src/modules/minisite-semantic-engine/search-demand-review-queue");

async function run({ queueRunner = buildQueue, certifier = certify, emitOutput = true } = {}) {
  const reportDir = process.env.MSE_25_51_REPORT_DIR || process.env.MSE_25_50_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const queue = await queueRunner({ emitOutput: false });
  const certification = certifier({ queue, reportDir, emitOutput: false });
  const result = {
    type: "MSE_25_51_SEARCH_DEMAND_REVIEW_OBSERVATION",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    publicWrites: false,
    queueReportPath: queue.reportPath,
    certificationReportPath: certification.reportPath,
    queueFingerprint: queue.queueFingerprint,
    certificationFingerprint: certification.certificationFingerprint,
    certified: certification.certified === true,
    dataState: queue.dataState || null,
    lifecycleState: queue.lifecycleState || null,
    reviewItemCount: Number(queue.summary?.reviewItemCount || 0),
    executableCount: Number(queue.summary?.executableCount || 0),
    automaticWriteCount: Number(queue.summary?.automaticWriteCount || 0),
    policy: queue.policy,
  };
  result.observationFingerprint = fingerprint(result);
  const reportPath = path.join(reportDir, `mse-25-51-observation-${result.observationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: result.certified, ...result, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_51_OBSERVATION_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
