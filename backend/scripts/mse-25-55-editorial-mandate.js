#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildEditorialMandatePreview, certifyEditorialMandatePreview } = require("../src/modules/minisite-semantic-engine/editorial-mandate-preview");

function readJson(file) {
  if (!file || !fs.existsSync(file)) throw new Error(`MSE_25_55_SOURCE_REPORT_MISSING:${file || "null"}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function required(name, value) {
  if (!value || !String(value).trim()) throw new Error(`MSE_25_55_${name}_REQUIRED`);
  return String(value).trim();
}

function writeImmutable(file, payload) {
  const fd = fs.openSync(file, "wx", 0o600);
  try {
    fs.writeFileSync(fd, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    fs.fsyncSync(fd);
  } finally { fs.closeSync(fd); }
}

async function run({ emitOutput = true } = {}) {
  const sourcePath = required("SOURCE_REPORT", process.env.MSE_25_55_SOURCE_REPORT);
  const reportDir = process.env.MSE_25_55_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const source = readJson(sourcePath);
  const mandate = buildEditorialMandatePreview({ decisionReport: source });
  const certification = certifyEditorialMandatePreview(mandate);
  if (!certification.certified) throw new Error(`MSE_25_55_CERTIFICATION_FAILED:${certification.reasons.join(",")}`);

  const report = {
    type: "MSE_25_55_EDITORIAL_MANDATE_REPORT",
    generatedAt: new Date().toISOString(),
    certified: true,
    readOnly: true,
    writes: false,
    publicWrites: false,
    sourceHumanDecisionReportPath: sourcePath,
    sourceDecisionFingerprint: mandate.sourceDecisionFingerprint,
    sourcePacketFingerprint: mandate.sourcePacketFingerprint,
    sourceDecisionChainFingerprint: mandate.sourceDecisionChainFingerprint,
    mandate,
    certification,
    summary: { mandateCount: 1, executableCount: 0, automaticWriteCount: 0, publicWriteCount: 0 },
    policy: {
      existingPageOnly: true,
      pageCreationAllowed: false,
      publicationAllowed: false,
      websiteDesignerMutationAllowed: false,
      humanApprovalRequiredBeforeAnyFutureMutation: true,
    },
  };
  const reportPath = path.join(reportDir, `mse-25-55-editorial-mandate-${mandate.mandateFingerprint.slice(0, 12)}.json`);
  writeImmutable(reportPath, report);
  const output = { ok: true, reportPath, ...report };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, certified: false, readOnly: true, writes: false, publicWrites: false, error: error.code || "MSE_25_55_EDITORIAL_MANDATE_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run, readJson, required, writeImmutable };
