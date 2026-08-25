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
  assert.equal(report.analyticsProvided, false);
  assert.equal(report.analyticsInputState, "NOT_PROVIDED");
  assert.equal(report.analyticsAvailable, false);
  assert.equal(report.dataState, "NO_DATA_YET");
  assert.equal(report.lifecycleState, "WAITING_FOR_SEARCH_DEMAND_DATA");
  assert.equal(report.demandConclusion, "UNDETERMINED_NO_DATA");
  assert.equal(report.noDataIsNotNoDemand, true);
  assert.equal(report.analyticsSource, null);
  assert.equal(report.summary.reviewEligibleCount, 0);
  assert.equal(report.summary.noEvidenceCount, 0);
  assert.equal(report.summary.unknownDueToNoDataCount, 1);
  assert.equal(report.signals[0].evidenceStrength, "none");
  assert.equal(report.signals[0].evidenceState, "UNKNOWN_NO_DATA");
  assert.equal(report.signals[0].automaticWrite, false);
});

test("an explicit zero-row Search Console dataset remains unknown, not no demand", () => {
  const analytics = {
    source: "google-search-console",
    siteUrl: "sc-domain:mondescale.com",
    startDate: "2026-07-26",
    endDate: "2026-08-22",
    dataState: "final",
    rowCount: 0,
    rows: [],
    analyticsFingerprint: "a".repeat(64),
  };
  const report = buildSearchDemandEvidence({ preview: preview(), analytics });
  assert.equal(report.analyticsProvided, true);
  assert.equal(report.analyticsInputState, "PROVIDED_EMPTY");
  assert.equal(report.analyticsAvailable, false);
  assert.equal(report.analyticsRowCount, 0);
  assert.equal(report.dataState, "NO_DATA_YET");
  assert.equal(report.lifecycleState, "WAITING_FOR_SEARCH_DEMAND_DATA");
  assert.equal(report.demandConclusion, "UNDETERMINED_NO_DATA");
  assert.equal(report.sourceAnalyticsFingerprint, analytics.analyticsFingerprint);
  assert.deepEqual(report.analyticsSource, {
    source: "google-search-console",
    siteUrl: "sc-domain:mondescale.com",
    startDate: "2026-07-26",
    endDate: "2026-08-22",
    dataState: "final",
  });
  assert.equal(report.summary.noEvidenceCount, 0);
  assert.equal(report.summary.unknownDueToNoDataCount, 1);
  assert.equal(report.summary.reviewEligibleCount, 0);
  assert.equal(report.signals[0].evidenceState, "UNKNOWN_NO_DATA");
  assert.equal(report.signals[0].eligibleForSeoReview, false);
});

test("real impressions in the opportunity band can become human-review evidence", () => {
  const report = buildSearchDemandEvidence({ preview: preview(), analytics: { rows: [{ query: "croisières gien", page: "https://example.test/gien/", impressions: 140, clicks: 3, ctr: 0.02, position: 12 }] } });
  assert.equal(report.analyticsInputState, "PROVIDED_WITH_ROWS");
  assert.equal(report.analyticsAvailable, true);
  assert.equal(report.dataState, "DATA_AVAILABLE");
  assert.equal(report.lifecycleState, "SEARCH_DEMAND_EVIDENCE_READY");
  assert.equal(report.demandConclusion, "EVIDENCE_EVALUATED");
  assert.equal(report.signals[0].evidenceStrength, "high");
  assert.equal(report.signals[0].evidenceState, "EVIDENCE_OBSERVED");
  assert.equal(report.signals[0].eligibleForSeoReview, true);
  assert.equal(report.summary.automaticWriteCount, 0);
});

test("rows without matching demand are only no matching evidence when a dataset exists", () => {
  const report = buildSearchDemandEvidence({ preview: preview(), analytics: { rows: [{ query: "hôtel paris", page: "https://example.test/paris/", impressions: 8, clicks: 0, ctr: 0, position: 60 }] } });
  assert.equal(report.analyticsAvailable, true);
  assert.equal(report.demandConclusion, "EVIDENCE_EVALUATED");
  assert.equal(report.signals[0].evidenceState, "NO_MATCHING_EVIDENCE");
  assert.equal(report.summary.noEvidenceCount, 1);
  assert.equal(report.summary.unknownDueToNoDataCount, 0);
  assert.equal(report.signals[0].eligibleForSeoReview, false);
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
