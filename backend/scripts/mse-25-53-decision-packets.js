#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: observePrioritization } = require("./mse-25-52-observe");
const { buildSeoReviewDecisionPackets } = require("../src/modules/minisite-semantic-engine/seo-review-decision-packets");

function readJson(file) {
  if (!file || !fs.existsSync(file)) throw new Error(`MSE_25_53_SOURCE_REPORT_MISSING:${file || "null"}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function run({ observer = observePrioritization, emitOutput = true } = {}) {
  const reportDir = process.env.MSE_25_53_REPORT_DIR || process.env.MSE_25_52_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });

  const observation = await observer({ emitOutput: false });
  if (observation.certified !== true || observation.writes === true || observation.publicWrites === true) {
    throw new Error("MSE_25_53_UNSAFE_MSE_25_52_OBSERVATION");
  }
  const source = readJson(observation.prioritizationReportPath);
  const prioritization = {
    ...source,
    certified: observation.certified === true,
    writes: false,
    publicWrites: false,
    executableCount: Number(observation.executableCount || source.summary?.executableCount || 0),
    automaticWriteCount: Number(observation.automaticWriteCount || source.summary?.automaticWriteCount || 0),
  };
  const packets = buildSeoReviewDecisionPackets({ prioritization });
  const reportPath = path.join(reportDir, `mse-25-53-decision-packets-${packets.packetFingerprint.slice(0, 12)}.json`);
  const report = {
    ...packets,
    sourceMse52ObservationReportPath: observation.reportPath || null,
    sourcePrioritizationReportPath: observation.prioritizationReportPath || null,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: true, ...report, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_53_DECISION_PACKETS_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run, readJson };
