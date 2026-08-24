"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { qualifySeoSignals } = require("../src/modules/minisite-semantic-engine/seo-signal-qualification");

function preview() {
  return {
    version: "mse-25.40",
    operation: "network-local-semantic-preview",
    planFingerprint: "a".repeat(64),
    readOnly: true,
    writes: false,
    destructive: false,
    policy: { automaticWrites: false },
    agencies: [{
      site: { slug: "gien", agencyId: 4, city: "Gien" },
      coverage: [
        { intentKey: "agency", label: "agence de voyages", commercial: true, priority: 100, status: "strong", bestPageSlug: "home", bestScore: 100, bestLocalityScore: 100, bestPageManagedRoute: false, bestPageWriteEligible: true, candidatePages: [] },
        { intentKey: "services", label: "services", commercial: true, priority: 92, status: "strong", bestPageSlug: "services", bestScore: 100, bestLocalityScore: 70, bestPageManagedRoute: false, bestPageWriteEligible: true, candidatePages: [] },
        { intentKey: "ticketing", label: "billetterie", commercial: true, priority: 90, status: "covered", bestPageSlug: "services", bestScore: 48, bestLocalityScore: 70, bestPageManagedRoute: false, bestPageWriteEligible: true, candidatePages: [] },
        { intentKey: "cruise", label: "croisières", commercial: true, priority: 88, status: "gap", gapReason: "intent-weak", bestPageSlug: "home", bestScore: 24, bestLocalityScore: 100, bestPageManagedRoute: false, bestPageWriteEligible: true, candidatePages: [{ slug: "home", score: 24, localityScore: 100, managedRoute: false, writeEligible: true }] },
      ],
      semanticProposals: { proposals: [] },
      topicGraph: { orphanPages: ["home"], summary: { orphanPageCount: 1 } },
      cannibalization: [{ intentKey: "agency", severity: "medium", blocking: false, pages: [{ slug: "home", score: 100 }, { slug: "agence", score: 92 }] }],
    }],
    summary: { semanticGapCount: 1, semanticOrphanPageCount: 1, cannibalizationConflictCount: 1, automaticWriteCount: 0 },
  };
}

test("qualification keeps home-fill gap observable but non executable", () => {
  const report = qualifySeoSignals(preview());
  assert.equal(report.readOnly, true);
  assert.equal(report.writes, false);
  assert.equal(report.summary.gapCount, 1);
  assert.equal(report.summary.laterExecutionCandidateCount, 0);
  assert.equal(report.gaps[0].disposition, "observe");
  assert.equal(report.gaps[0].residualSuppressionReason, "home-secondary-fill-prohibited");
  assert.equal(report.summary.orphanCount, 1);
  assert.equal(report.summary.cannibalizationCount, 1);
  assert.equal(report.summary.automaticWriteCount, 0);
});

test("qualification fails closed on unsafe preview", () => {
  assert.throws(() => qualifySeoSignals({ ...preview(), writes: true }), /read-only/);
});
