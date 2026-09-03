#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { fingerprint } = require("../src/modules/minisite-semantic-engine/search-demand-evidence");

function certify(history) {
  const violations = [];
  if (!history || history.type !== "mse-25.50-search-demand-history") violations.push("INVALID_HISTORY_TYPE");
  if (history?.readOnly !== true || history?.writes !== false) violations.push("HISTORY_NOT_READ_ONLY");
  if (history?.policy?.automaticWrites !== false) violations.push("AUTOMATIC_WRITES_NOT_DISABLED");
  if (history?.policy?.humanReviewRequired !== true) violations.push("HUMAN_REVIEW_NOT_REQUIRED");
  if (history?.noDataIsNotNoDemand !== true) violations.push("NO_DATA_POLICY_MISSING");
  if ((history?.snapshots || []).some((item) => Number(item.automaticWriteCount || 0) !== 0)) violations.push("AUTOMATIC_WRITE_OBSERVED");
  return { certified: violations.length === 0, violations };
}

function run({ history, historyFile = process.env.MSE_25_50_HISTORY_FILE, reportDir = process.env.MSE_25_50_REPORT_DIR || "/tmp", emitOutput = true } = {}) {
  const source = history || (historyFile ? JSON.parse(fs.readFileSync(historyFile, "utf8")) : null);
  if (!source) throw new Error("MSE-25.50 history input is required.");
  const verdict = certify(source);
  const certification = {
    type: "mse-25.50-search-demand-history-certification",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    sourceHistoryFingerprint: source.historyFingerprint || null,
    snapshotCount: Number(source.snapshotCount || 0),
    ...verdict,
  };
  const certificationFingerprint = fingerprint(certification);
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-50-certification-${certificationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify({ ...certification, certificationFingerprint }, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: verdict.certified, readOnly: true, writes: false, reportPath, certificationFingerprint, certification: { ...certification, certificationFingerprint } };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  if (!verdict.certified) {
    const error = new Error("MSE-25.50 history certification failed.");
    error.code = "MSE_25_50_HISTORY_NOT_CERTIFIED";
    error.details = output;
    throw error;
  }
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_50_CERTIFICATION_FAILED", message: error.message, details: error.details || null }, null, 2));
  process.exitCode = 1;
});

module.exports = { run, certify };
