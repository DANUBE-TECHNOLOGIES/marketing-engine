"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildInternalLinkEvidence } = require("../src/modules/minisite-semantic-engine/internal-link-evidence");

function preview() {
  return {
    readOnly: true,
    writes: false,
    planFingerprint: "a".repeat(64),
    agencies: [{
      site: { slug: "gien", agencyId: 4, city: "Gien" },
      coverage: [
        { intentKey: "agency", status: "strong", bestPageSlug: "agence", bestScore: 100, bestLocalityScore: 70, bestPageManagedRoute: false, bestPageWriteEligible: true },
        { intentKey: "services", status: "strong", bestPageSlug: "services", bestScore: 100, bestLocalityScore: 70, bestPageManagedRoute: false, bestPageWriteEligible: true },
        { intentKey: "contact", status: "strong", bestPageSlug: "contact", bestScore: 100, bestLocalityScore: 70, bestPageManagedRoute: false, bestPageWriteEligible: true },
        { intentKey: "commitments", status: "strong", bestPageSlug: "engagements", bestScore: 100, bestLocalityScore: 70, bestPageManagedRoute: false, bestPageWriteEligible: true },
      ],
    }],
  };
}

function actionPlan() {
  return {
    actionPlanFingerprint: "b".repeat(64),
    readOnly: true,
    writes: false,
    orphanActions: [{ siteSlug: "gien", agencyId: 4, city: "Gien", pageSlug: "engagements" }],
  };
}

test("internal-link evidence prefers services and remains read-only", () => {
  const report = buildInternalLinkEvidence(preview(), actionPlan());
  assert.equal(report.readOnly, true);
  assert.equal(report.writes, false);
  assert.equal(report.summary.orphanCount, 1);
  assert.equal(report.summary.contextualLinkCandidateCount, 1);
  assert.equal(report.items[0].preferredSource.pageSlug, "services");
  assert.equal(report.items[0].preferredSource.sourceIntent, "services");
  assert.equal(report.items[0].automaticWrite, false);
  assert.match(report.evidenceFingerprint, /^[0-9a-f]{64}$/);
});

test("managed or non writable sources are excluded from preferred source", () => {
  const source = preview();
  source.agencies[0].coverage = source.agencies[0].coverage.map((row) => ({ ...row, bestPageManagedRoute: true, bestPageWriteEligible: false }));
  const report = buildInternalLinkEvidence(source, actionPlan());
  assert.equal(report.items[0].preferredSource, null);
  assert.equal(report.items[0].decision, "manual-navigation-review");
});

test("internal-link evidence fails closed on unsafe inputs", () => {
  assert.throws(() => buildInternalLinkEvidence({ ...preview(), writes: true }, actionPlan()), /read-only/);
});
