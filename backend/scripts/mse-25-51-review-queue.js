#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: observeHistory } = require("./mse-25-50-observe-history");
const { buildSearchDemandReviewQueue } = require("../src/modules/minisite-semantic-engine/search-demand-review-queue");

async function run({ observer = observeHistory, emitOutput = true } = {}) {
  const reportDir = process.env.MSE_25_51_REPORT_DIR || process.env.MSE_25_50_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const observation = await observer({ emitOutput: false });
  const queue = buildSearchDemandReviewQueue({ observation });
  const reportPath = path.join(reportDir, `mse-25-51-review-queue-${queue.queueFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(queue, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: true, ...queue, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_51_REVIEW_QUEUE_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
