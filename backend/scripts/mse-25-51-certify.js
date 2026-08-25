#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { fingerprint } = require("../src/modules/minisite-semantic-engine/search-demand-review-queue");

function certify({ queue, reportDir = process.env.MSE_25_51_REPORT_DIR || "/tmp", emitOutput = true } = {}) {
  if (!queue) throw new Error("MSE_25_51_QUEUE_REQUIRED");
  const violations = [];
  if (queue.readOnly !== true || queue.writes !== false) violations.push("QUEUE_NOT_READ_ONLY");
  if (Number(queue.summary?.executableCount || 0) !== 0) violations.push("EXECUTABLE_ITEMS_PRESENT");
  if (Number(queue.summary?.automaticWriteCount || 0) !== 0) violations.push("AUTOMATIC_WRITES_PRESENT");
  for (const item of queue.items || []) {
    if (item.reviewOnly !== true || item.executable !== false || item.automaticWrite !== false) violations.push(`UNSAFE_ITEM:${item.key || "unknown"}`);
  }
  const certified = violations.length === 0;
  const certification = {
    type: "MSE_25_51_REVIEW_QUEUE_CERTIFICATION",
    readOnly: true,
    writes: false,
    sourceQueueFingerprint: queue.queueFingerprint || null,
    certified,
    violations,
    policy: queue.policy || null,
  };
  certification.certificationFingerprint = fingerprint(certification);
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-51-certification-${certification.certificationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(certification, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: certified, ...certification, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) {
  const queuePath = process.env.MSE_25_51_QUEUE_FILE;
  if (!queuePath) {
    console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: "MSE_25_51_QUEUE_FILE_REQUIRED" }, null, 2));
    process.exitCode = 1;
  } else {
    try { certify({ queue: JSON.parse(fs.readFileSync(queuePath, "utf8")) }); }
    catch (error) { console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: "MSE_25_51_CERTIFICATION_FAILED", message: error.message }, null, 2)); process.exitCode = 1; }
  }
}

module.exports = { certify };
