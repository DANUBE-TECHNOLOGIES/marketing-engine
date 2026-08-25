"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildSearchDemandEvidence, evidenceStrength } = require("../src/modules/minisite-semantic-engine/search-demand-evidence");

function preview() {
  return {
    readOnly: true,
    writes: false,
    policy: { automaticWrites: false },
    planFingerprint: "p".repeat(64),
    agencies: [{
      site: { slug: "gien", agencyId: 4, city: "Gien" },
      coverage: [{ intentKey: "cruise", label: "Croisières", commercial: true, status: "gap", bestPageSlug: "home", bestScore: 32 }],
    }],
  };
}

test("semantic gap alone never becomes search-demand evidence", () => {
  const report = buildSearchDemandEvidence({ preview: preview(), analytics: null });
  assert.equal(report.analyticsAvailable, false);
  assert.equal(report.summary.reviewEligibleCount, 0);
  assert.equal(report.signals[0].evidenceStrength, "none");
  assert.equal(report.signals[0].automaticWrite, false);
});

test("real impressions in the opportunity band can become human-review evidence", () => {
  const report = buildSearchDemandEvidence({ preview: preview(), analytics: { rows: [{ query: "croisières gien", page: "https://example.test/gien/", impressions: 140, clicks: 3, ctr: 0.02, position: 12 }] } });
  assert.equal(report.analyticsAvailable, true);
  assert.equal(report.signals[0].evidenceStrength, "high");
  assert.equal(report.signals[0].eligibleForSeoReview, true);
  assert.equal(report.summary.automaticWriteCount, 0);
});

test("ranking evidence thresholds are deterministic", () => {
  assert.equal(evidenceStrength({ impressions: 100, position: 10 }), "high");
  assert.equal(evidenceStrength({ impressions: 40, position: 20 }), "medium");
  assert.equal(evidenceStrength({ impressions: 12, position: 60 }), "weak");
  assert.equal(evidenceStrength({ impressions: 2, position: 70 }), "none");
});

test("unsafe semantic preview fails closed", () => {
  assert.throws(() => buildSearchDemandEvidence({ preview: { ...preview(), writes: true } }), /read-only/);
});
