"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSeoCertification } = require("../src/modules/minisite-semantic-engine/seo-certification");

const source = {
  readOnly: true,
  writes: false,
  destructive: false,
  planFingerprint: "a".repeat(64),
  tenantSlug: "mondescale",
  policy: { automaticWrites: false, managedRoutesAware: true },
  summary: { agenciesProcessed: 7, publishedPageCount: 80, strongIntentCount: 56, coveredIntentCount: 8, semanticGapCount: 27, commercialGapCount: 27, semanticOrphanPageCount: 7, cannibalizationConflictCount: 8, blockingConflictCount: 0, automaticWriteCount: 0 },
};

test("certification observes residual SEO signals without turning them into writes", () => {
  const report = buildSeoCertification(source, { generatedAt: "2026-08-24T17:00:00.000Z" });
  assert.equal(report.health.safe, true);
  assert.equal(report.health.requiresHumanSeoReview, true);
  assert.equal(report.health.automaticRemediationAllowed, false);
  assert.equal(report.metrics.semanticGapCount, 27);
  assert.match(report.certificationFingerprint, /^[0-9a-f]{64}$/);
});

test("certification fails closed on an unsafe source", () => {
  assert.throws(() => buildSeoCertification({ ...source, writes: true }), /read-only/);
});
