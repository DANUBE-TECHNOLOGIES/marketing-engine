"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSeoReviewDecisionPackets } = require("../src/modules/minisite-semantic-engine/seo-review-decision-packets");

function source(overrides = {}) {
  return {
    certified: true,
    writes: false,
    publicWrites: false,
    executableCount: 0,
    automaticWriteCount: 0,
    prioritizationFingerprint: "prio-1",
    dataState: "DATA_AVAILABLE",
    lifecycleState: "SEARCH_DEMAND_LIFECYCLE_ACTIVE",
    items: [],
    ...overrides,
  };
}

test("empty certified prioritization produces a safe empty packet set", () => {
  const result = buildSeoReviewDecisionPackets({ prioritization: source(), generatedAt: "2026-08-25T00:00:00.000Z" });
  assert.equal(result.summary.packetCount, 0);
  assert.equal(result.summary.executableCount, 0);
  assert.equal(result.policy.humanDecisionRequired, true);
});

test("review item becomes decision packet but never executable action", () => {
  const result = buildSeoReviewDecisionPackets({ prioritization: source({ items: [{ key: "gien|ticketing", siteSlug: "gien", intent: "ticketing", priority: "HIGH_REVIEW_PRIORITY", priorityScore: 88, evidenceLevel: "HIGH", impressions: 120, clicks: 4, position: 8, reviewOnly: true, executable: false, automaticWrite: false }] }), generatedAt: "2026-08-25T00:00:00.000Z" });
  assert.equal(result.packets.length, 1);
  assert.equal(result.packets[0].suggestedReviewType, "REVIEW_EXISTING_PAGE_ALIGNMENT");
  assert.equal(result.packets[0].humanDecisionRequired, true);
  assert.equal(result.packets[0].executable, false);
  assert.equal(result.packets[0].websiteDesignerMutationAllowed, false);
});

test("unsafe prioritization fails closed", () => {
  assert.throws(() => buildSeoReviewDecisionPackets({ prioritization: source({ certified: false }) }), /UNCERTIFIED/);
  assert.throws(() => buildSeoReviewDecisionPackets({ prioritization: source({ writes: true }) }), /UNSAFE/);
  assert.throws(() => buildSeoReviewDecisionPackets({ prioritization: source({ executableCount: 1 }) }), /EXECUTABLE/);
});

test("unsafe review item fails closed", () => {
  assert.throws(() => buildSeoReviewDecisionPackets({ prioritization: source({ items: [{ key: "x", reviewOnly: false, executable: false, automaticWrite: false }] }) }), /UNSAFE_REVIEW_ITEM/);
});

test("packets are deterministic with fixed generatedAt", () => {
  const prioritization = source({ items: [{ key: "b", priority: "LOW_REVIEW_PRIORITY", reviewOnly: true, executable: false, automaticWrite: false }, { key: "a", priority: "HIGH_REVIEW_PRIORITY", reviewOnly: true, executable: false, automaticWrite: false }] });
  const a = buildSeoReviewDecisionPackets({ prioritization, generatedAt: "2026-08-25T00:00:00.000Z" });
  const b = buildSeoReviewDecisionPackets({ prioritization, generatedAt: "2026-08-25T00:00:00.000Z" });
  assert.deepEqual(a, b);
  assert.deepEqual(a.packets.map((p) => p.key), ["a", "b"]);
});
