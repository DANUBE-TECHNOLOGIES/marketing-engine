#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function certify(prioritization = {}) {
  const violations = [];
  if (prioritization.readOnly !== true || prioritization.writes !== false || prioritization.publicWrites !== false) violations.push("PRIORITIZATION_NOT_READ_ONLY");
  if (prioritization.policy?.rankingIsAdvisoryOnly !== true) violations.push("RANKING_NOT_ADVISORY");
  if (prioritization.policy?.humanReviewRequired !== true) violations.push("HUMAN_REVIEW_NOT_REQUIRED");
  if (prioritization.policy?.automaticWrites !== false) violations.push("AUTOMATIC_WRITES_NOT_DISABLED");
  if (Number(prioritization.summary?.executableCount || 0) !== 0) violations.push("EXECUTABLE_ITEMS_PRESENT");
  if (Number(prioritization.summary?.automaticWriteCount || 0) !== 0) violations.push("AUTOMATIC_WRITES_PRESENT");
  for (const item of prioritization.items || []) {
    if (item.reviewOnly !== true || item.executable !== false || item.automaticWrite !== false) violations.push(`UNSAFE_ITEM:${item.key || "unknown"}`);
  }
  return { certified: violations.length === 0, violations };
}

function run({ prioritization, prioritizationFile = process.env.MSE_25_52_PRIORITIZATION_FILE, reportDir = process.env.MSE_25_52_REPORT_DIR || "/tmp", emitOutput = true } = {}) {
  const source = prioritization || (prioritizationFile ? JSON.parse(fs.readFileSync(prioritizationFile, "utf8")) : null);
  if (!source) throw new Error("MSE_25_52_PRIORITIZATION_REQUIRED");
  const verdict = certify(source);
  const certification = {
    type: "MSE_25_52_REVIEW_PRIORITIZATION_CERTIFICATION",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    sourcePrioritizationFingerprint: source.prioritizationFingerprint || null,
    ...verdict,
  };
  certification.certificationFingerprint = fingerprint(certification);
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-52-certification-${certification.certificationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(certification, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: verdict.certified, ...certification, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) {
  try { run(); }
  catch (error) { console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: "MSE_25_52_CERTIFICATION_FAILED", message: error.message }, null, 2)); process.exitCode = 1; }
}

module.exports = { certify, run };
