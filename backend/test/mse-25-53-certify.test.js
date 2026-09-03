"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { certify } = require("../scripts/mse-25-53-certify");

function safe(overrides = {}) {
  return {
    readOnly: true,
    writes: false,
    publicWrites: false,
    packetFingerprint: "packet-1",
    summary: { packetCount: 0, executableCount: 0, automaticWriteCount: 0 },
    policy: { humanDecisionRequired: true, decisionDoesNotExecute: true, automaticWrites: false },
    packets: [],
    ...overrides,
  };
}

test("safe empty packet set certifies", () => {
  const result = certify({ packets: safe(), emitOutput: false });
  assert.equal(result.certified, true);
});

test("executable packet set fails closed", () => {
  const result = certify({ packets: safe({ summary: { executableCount: 1, automaticWriteCount: 0 } }), emitOutput: false });
  assert.equal(result.certified, false);
  assert.ok(result.violations.includes("EXECUTABLE_PACKETS_PRESENT"));
});

test("packet capability flags cannot permit mutation", () => {
  const result = certify({ packets: safe({ packets: [{ key: "x", humanDecisionRequired: true, reviewOnly: true, executable: false, automaticWrite: false, pageCreationAllowed: true, publicationAllowed: false, websiteDesignerMutationAllowed: false }] }), emitOutput: false });
  assert.equal(result.certified, false);
  assert.ok(result.violations.some((v) => v.startsWith("UNSAFE_CAPABILITY")));
});
