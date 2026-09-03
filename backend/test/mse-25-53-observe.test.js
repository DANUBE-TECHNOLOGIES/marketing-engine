"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { run } = require("../scripts/mse-25-53-observe");

test("end-to-end decision observation remains read-only and non executable", async () => {
  const packetRunner = async () => ({
    ok: true,
    readOnly: true,
    writes: false,
    publicWrites: false,
    reportPath: "/tmp/packets.json",
    packetFingerprint: "packet-fp",
    dataState: "DATA_AVAILABLE",
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
    summary: { packetCount: 1, highPriorityPacketCount: 1, mediumPriorityPacketCount: 0, lowPriorityPacketCount: 0, executableCount: 0, automaticWriteCount: 0 },
    policy: { advisoryOnly: true, humanDecisionRequired: true, decisionDoesNotExecute: true, noAutomaticPageCreation: true, noAutomaticContentWrite: true, noAutomaticPublication: true, websiteDesignerMutation: false, automaticWrites: false },
    packets: [],
  });
  const certifier = () => ({ certified: true, reportPath: "/tmp/cert.json", certificationFingerprint: "cert-fp" });
  const result = await run({ packetRunner, certifier, emitOutput: false });
  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.writes, false);
  assert.equal(result.executableCount, 0);
  assert.equal(result.automaticWriteCount, 0);
});
