"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildHumanDecisionChain, certifyHumanDecisionChain } = require("../src/modules/minisite-semantic-engine/human-seo-review-decision-chain");

function source(overrides = {}) {
  return {
    readOnly: true, writes: false, publicWrites: false,
    packetFingerprint: "packet-fingerprint", sourcePrioritizationFingerprint: "priority-fingerprint",
    summary: { executableCount: 0, automaticWriteCount: 0 },
    packets: [{
      key: "gien:ticketing", siteSlug: "gien", intent: "ticketing", query: "billet avion gien", page: "/services",
      priority: "HIGH_REVIEW_PRIORITY", priorityScore: 90, evidenceLevel: "HIGH", impressions: 120, clicks: 8, position: 11,
      lifecycleStatus: "PERSISTING", decisionOptions: ["KEEP_AS_IS", "REFINE_EXISTING_PAGE", "REQUEST_MORE_EVIDENCE"],
      humanDecisionRequired: true, reviewOnly: true, executable: false, automaticWrite: false,
    }], ...overrides,
  };
}

test("MSE-25.53 packet to MSE-25.54 human decision chain is certified and non executable", () => {
  const chain = buildHumanDecisionChain({ packetReport: source(), packetKey: "gien:ticketing", decision: "REFINE_EXISTING_PAGE", reviewer: "seo-director", rationale: "Persistent demand merits an editorial proposal.", decidedAt: "2026-08-25T18:00:00.000Z" });
  const certification = certifyHumanDecisionChain(chain);
  assert.equal(certification.certified, true);
  assert.equal(chain.sourcePacketFingerprint, "packet-fingerprint");
  assert.equal(chain.decision.sourcePacketFingerprint, "packet-fingerprint");
  assert.equal(chain.decision.nextStep, "PREPARE_NON_EXECUTABLE_EDITORIAL_MANDATE");
  assert.equal(chain.summary.executableCount, 0);
  assert.equal(chain.summary.automaticWriteCount, 0);
  assert.equal(chain.decision.websiteDesignerMutationAllowed, false);
});

test("unsafe MSE-25.53 source fails closed before a human decision can be sealed", () => {
  assert.throws(() => buildHumanDecisionChain({ packetReport: source({ writes: true }), packetKey: "gien:ticketing", decision: "KEEP_AS_IS", reviewer: "seo-director", rationale: "Current page remains sufficient for observed demand." }), /SOURCE_CERTIFICATION_FAILED/);
});

test("tampered chain fingerprint linkage fails certification", () => {
  const chain = buildHumanDecisionChain({ packetReport: source(), packetKey: "gien:ticketing", decision: "KEEP_AS_IS", reviewer: "seo-director", rationale: "Current page remains sufficient for observed demand.", decidedAt: "2026-08-25T18:00:00.000Z" });
  chain.decision.sourcePacketFingerprint = "tampered";
  assert.equal(certifyHumanDecisionChain(chain).certified, false);
  assert.ok(certifyHumanDecisionChain(chain).reasons.includes("SOURCE_FINGERPRINT_MISMATCH"));
});
