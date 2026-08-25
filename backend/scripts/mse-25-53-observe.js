#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: buildPackets } = require("./mse-25-53-decision-packets");
const { certify } = require("./mse-25-53-certify");
const { fingerprint } = require("../src/modules/minisite-semantic-engine/seo-review-decision-packets");

async function run({ packetRunner = buildPackets, certifier = certify, emitOutput = true } = {}) {
  const reportDir = process.env.MSE_25_53_REPORT_DIR || process.env.MSE_25_52_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const packets = await packetRunner({ emitOutput: false });
  const certification = certifier({ packets, reportDir, emitOutput: false });
  const result = {
    type: "MSE_25_53_SEO_REVIEW_DECISION_OBSERVATION",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    publicWrites: false,
    packetReportPath: packets.reportPath,
    certificationReportPath: certification.reportPath,
    packetFingerprint: packets.packetFingerprint,
    certificationFingerprint: certification.certificationFingerprint,
    certified: certification.certified === true,
    dataState: packets.dataState || null,
    lifecycleState: packets.lifecycleState || null,
    packetCount: Number(packets.summary?.packetCount || 0),
    highPriorityPacketCount: Number(packets.summary?.highPriorityPacketCount || 0),
    mediumPriorityPacketCount: Number(packets.summary?.mediumPriorityPacketCount || 0),
    lowPriorityPacketCount: Number(packets.summary?.lowPriorityPacketCount || 0),
    executableCount: Number(packets.summary?.executableCount || 0),
    automaticWriteCount: Number(packets.summary?.automaticWriteCount || 0),
    policy: packets.policy,
  };
  result.observationFingerprint = fingerprint(result);
  const reportPath = path.join(reportDir, `mse-25-53-observation-${result.observationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(result, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: result.certified, ...result, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_53_OBSERVATION_FAILED", message: error.message }, null, 2));
  process.exitCode = 1;
});

module.exports = { run };
