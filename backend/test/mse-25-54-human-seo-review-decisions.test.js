"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildHumanSeoReviewDecision, certifyHumanSeoReviewDecision } = require("../src/modules/minisite-semantic-engine/human-seo-review-decisions");

function packetReport() {
  return {
    readOnly: true, writes: false, publicWrites: false,
    packetFingerprint: "packet-fingerprint", sourcePrioritizationFingerprint: "priority-fingerprint",
    summary: { executableCount: 0, automaticWriteCount: 0 },
    packets: [{
      key: "gien:ticketing", siteSlug: "gien", intent: "ticketing", query: "billet avion gien", page: "/services",
      priority: "HIGH_REVIEW_PRIORITY", priorityScore: 90, evidenceLevel: "HIGH", impressions: 120, clicks: 8, position: 11,
      lifecycleStatus: "PERSISTING", decisionOptions: ["KEEP_AS_IS", "REFINE_EXISTING_PAGE", "REQUEST_MORE_EVIDENCE"],
      humanDecisionRequired: true, reviewOnly: true, executable: false, automaticWrite: false,
    }],
  };
}

test("human refinement decision remains non executable and sealed to evidence", () => {
  const record = buildHumanSeoReviewDecision({ packetReport: packetReport(), packetKey: "gien:ticketing", decision: "REFINE_EXISTING_PAGE", reviewer: "seo-director", rationale: "Persistent demand warrants editorial review.", decidedAt: "2026-08-25T18:00:00.000Z" });
  assert.equal(record.nextStep, "PREPARE_NON_EXECUTABLE_EDITORIAL_MANDATE");
  assert.equal(record.executable, false);
  assert.equal(record.automaticWrite, false);
  assert.equal(record.websiteDesignerMutationAllowed, false);
  assert.equal(record.sourcePacketFingerprint, "packet-fingerprint");
  assert.equal(certifyHumanSeoReviewDecision(record).certified, true);
});

test("keep decision creates no change request", () => {
  const record = buildHumanSeoReviewDecision({ packetReport: packetReport(), packetKey: "gien:ticketing", decision: "KEEP_AS_IS", reviewer: "seo-director", rationale: "Existing coverage is sufficient for current demand." });
  assert.equal(record.nextStep, "NO_CHANGE_REQUESTED");
});

test("more evidence decision continues observation", () => {
  const record = buildHumanSeoReviewDecision({ packetReport: packetReport(), packetKey: "gien:ticketing", decision: "REQUEST_MORE_EVIDENCE", reviewer: "seo-director", rationale: "Evidence remains insufficient for editorial refinement." });
  assert.equal(record.nextStep, "CONTINUE_OBSERVATION");
});

test("decision fails closed for unknown packet or invalid decision", () => {
  assert.throws(() => buildHumanSeoReviewDecision({ packetReport: packetReport(), packetKey: "missing", decision: "KEEP_AS_IS", reviewer: "seo", rationale: "Enough rationale here." }), /PACKET_NOT_FOUND/);
  assert.throws(() => buildHumanSeoReviewDecision({ packetReport: packetReport(), packetKey: "gien:ticketing", decision: "PUBLISH", reviewer: "seo", rationale: "Enough rationale here." }), /INVALID_DECISION/);
});

test("certification rejects any execution capability", () => {
  const record = buildHumanSeoReviewDecision({ packetReport: packetReport(), packetKey: "gien:ticketing", decision: "REFINE_EXISTING_PAGE", reviewer: "seo-director", rationale: "Persistent demand warrants editorial review." });
  assert.equal(certifyHumanSeoReviewDecision({ ...record, executable: true }).certified, false);
  assert.equal(certifyHumanSeoReviewDecision({ ...record, websiteDesignerMutationAllowed: true }).certified, false);
});
