#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { fingerprint } = require("../src/modules/minisite-semantic-engine/seo-review-decision-packets");

function certify({ packets, reportDir = process.env.MSE_25_53_REPORT_DIR || "/tmp", emitOutput = true } = {}) {
  if (!packets) throw new Error("MSE_25_53_PACKETS_REQUIRED");
  const violations = [];
  if (packets.readOnly !== true || packets.writes !== false || packets.publicWrites !== false) violations.push("PACKETS_NOT_READ_ONLY");
  if (Number(packets.summary?.executableCount || 0) !== 0) violations.push("EXECUTABLE_PACKETS_PRESENT");
  if (Number(packets.summary?.automaticWriteCount || 0) !== 0) violations.push("AUTOMATIC_WRITES_PRESENT");
  if (packets.policy?.humanDecisionRequired !== true) violations.push("HUMAN_DECISION_NOT_REQUIRED");
  if (packets.policy?.decisionDoesNotExecute !== true) violations.push("DECISION_EXECUTION_NOT_BLOCKED");
  if (packets.policy?.automaticWrites !== false) violations.push("AUTOMATIC_WRITES_NOT_DISABLED");
  for (const packet of packets.packets || []) {
    if (packet.humanDecisionRequired !== true || packet.reviewOnly !== true || packet.executable !== false || packet.automaticWrite !== false) violations.push(`UNSAFE_PACKET:${packet.key || "unknown"}`);
    if (packet.pageCreationAllowed !== false || packet.publicationAllowed !== false || packet.websiteDesignerMutationAllowed !== false) violations.push(`UNSAFE_CAPABILITY:${packet.key || "unknown"}`);
  }

  const certified = violations.length === 0;
  const certification = {
    type: "MSE_25_53_DECISION_PACKET_CERTIFICATION",
    readOnly: true,
    writes: false,
    sourcePacketFingerprint: packets.packetFingerprint || null,
    certified,
    violations,
    summary: packets.summary || null,
    policy: packets.policy || null,
  };
  certification.certificationFingerprint = fingerprint(certification);
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, `mse-25-53-certification-${certification.certificationFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(certification, null, 2)}\n`, { mode: 0o600 });
  const output = { ok: certified, ...certification, reportPath };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return output;
}

if (require.main === module) {
  const file = process.env.MSE_25_53_PACKETS_FILE;
  if (!file) {
    console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: "MSE_25_53_PACKETS_FILE_REQUIRED" }, null, 2));
    process.exitCode = 1;
  } else {
    try { certify({ packets: JSON.parse(fs.readFileSync(file, "utf8")) }); }
    catch (error) { console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: "MSE_25_53_CERTIFICATION_FAILED", message: error.message }, null, 2)); process.exitCode = 1; }
  }
}

module.exports = { certify };
