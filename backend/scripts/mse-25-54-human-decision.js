#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  buildHumanDecisionChain,
  certifyHumanDecisionChain,
} = require("../src/modules/minisite-semantic-engine/human-seo-review-decision-chain");

function readJson(file) {
  if (!file || !fs.existsSync(file)) throw new Error(`MSE_25_54_SOURCE_REPORT_MISSING:${file || "null"}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function required(name, value) {
  if (!value || !String(value).trim()) throw new Error(`MSE_25_54_${name}_REQUIRED`);
  return String(value).trim();
}

async function run({ emitOutput = true } = {}) {
  const sourcePath = required("SOURCE_REPORT", process.env.MSE_25_54_SOURCE_REPORT);
  const packetKey = required("PACKET_KEY", process.env.MSE_25_54_PACKET_KEY);
  const decision = required("DECISION", process.env.MSE_25_54_DECISION);
  const reviewer = required("REVIEWER", process.env.MSE_25_54_REVIEWER);
  const rationale = required("RATIONALE", process.env.MSE_25_54_RATIONALE);
  const reportDir = process.env.MSE_25_54_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });

  const packetReport = readJson(sourcePath);
  const chain = buildHumanDecisionChain({ packetReport, packetKey, decision, reviewer, rationale });
  const certification = certifyHumanDecisionChain(chain);
  if (certification.certified !== true) {
    throw new Error(`MSE_25_54_CHAIN_CERTIFICATION_FAILED:${certification.reasons.join(",")}`);
  }

  const record = chain.decision;
  const report = {
    type: "MSE_25_54_HUMAN_SEO_REVIEW_DECISION_REPORT",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    publicWrites: false,
    sourceDecisionPacketReportPath: sourcePath,
    sourcePacketFingerprint: chain.sourcePacketFingerprint,
    sourcePrioritizationFingerprint: chain.sourcePrioritizationFingerprint,
    chainFingerprint: chain.chainFingerprint,
    decision: record,
    sourceCertification: chain.sourceCertification,
    decisionCertification: chain.decisionCertification,
    certification,
    summary: {
      decisionCount: 1,
      humanDecisionCount: 1,
      executableCount: 0,
      automaticWriteCount: 0,
      publicWriteCount: 0,
    },
    policy: {
      humanApprovalCaptured: true,
      decisionDoesNotExecute: true,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      noAutomaticPublication: true,
      websiteDesignerMutation: false,
    },
  };

  const reportPath = path.join(reportDir, `mse-25-54-human-decision-${record.decisionFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600, flag: "wx" });
  const output = { ok: true, certified: true, ...report, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, certified: false, readOnly: true, writes: false, publicWrites: false, error: error.code || "MSE_25_54_HUMAN_DECISION_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run, readJson, required };
