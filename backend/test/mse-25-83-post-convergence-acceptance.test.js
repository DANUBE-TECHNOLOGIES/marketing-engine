"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  destinationUrls,
  evaluate,
  readinessSummary,
  sitemapUrls,
} = require("../../scripts/mse-25-83-post-convergence-acceptance");

function baseResult() {
  return {
    frontendHealth: { status: 200 },
    localSitemap: { status: 200, urlCount: 115, destinationUrlCount: 42 },
    backendHealth: { status: 200 },
    searchConsoleHealth: { status: 200, provider: "google-search-console" },
    properties: { status: 200, hasExpectedProperty: true },
    runtimeReadiness: {
      status: 200,
      summary: {
        readyForGoogleDiscovery: true,
        publicIssueCount: 0,
        googleDataState: "NO_DATA_YET",
      },
    },
    publicRoot: { status: 200 },
    publicSitemap: { status: 200 },
  };
}

test("extracts sitemap and destination URLs", () => {
  const urls = sitemapUrls(`<?xml version="1.0"?><urlset><url><loc>https://agences.mondescale.com/agence/a</loc></url><url><loc>https://agences.mondescale.com/agence/a/destination/maldives</loc></url></urlset>`);
  assert.deepEqual(urls, [
    "https://agences.mondescale.com/agence/a",
    "https://agences.mondescale.com/agence/a/destination/maldives",
  ]);
  assert.deepEqual(destinationUrls(urls), ["https://agences.mondescale.com/agence/a/destination/maldives"]);
});

test("returns ready while Search Console has no data yet", () => {
  const verdict = evaluate(baseResult(), { expectedSitemapUrls: 115, expectedDestinationUrls: 42 });
  assert.equal(verdict.ready, true);
  assert.equal(verdict.verdict, "POST_CONVERGENCE_READY");
  assert.deepEqual(verdict.blockers, []);
  assert.ok(verdict.warnings.includes("WAITING_FOR_SEARCH_CONSOLE_DATA"));
});

test("separates edge outage from core readiness", () => {
  const result = baseResult();
  result.publicRoot.status = 502;
  result.publicSitemap.status = 502;
  const verdict = evaluate(result, { expectedSitemapUrls: 115, expectedDestinationUrls: 42 });
  assert.equal(verdict.ready, true);
  assert.equal(verdict.verdict, "CORE_READY_EDGE_DEGRADED");
  assert.ok(verdict.warnings.includes("PUBLIC_EDGE_UNAVAILABLE"));
  assert.ok(verdict.warnings.includes("PUBLIC_ROOT_UNAVAILABLE"));
});

test("blocks when destination count regresses", () => {
  const result = baseResult();
  result.localSitemap.destinationUrlCount = 0;
  const verdict = evaluate(result, { expectedSitemapUrls: 115, expectedDestinationUrls: 42 });
  assert.equal(verdict.ready, false);
  assert.ok(verdict.blockers.includes("DESTINATION_URL_COUNT_MISMATCH"));
});

test("blocks when runtime readiness reports public issues", () => {
  const result = baseResult();
  result.runtimeReadiness.summary.readyForGoogleDiscovery = false;
  result.runtimeReadiness.summary.publicIssueCount = 42;
  const verdict = evaluate(result, { expectedSitemapUrls: 115, expectedDestinationUrls: 42 });
  assert.equal(verdict.ready, false);
  assert.ok(verdict.blockers.includes("INDEXABILITY_NOT_READY"));
  assert.ok(verdict.blockers.includes("PUBLIC_INDEXABILITY_ISSUES"));
});

test("normalizes runtime readiness summary", () => {
  assert.deepEqual(readinessSummary({
    verdict: "READY_WAITING_FOR_SEARCH_CONSOLE_DATA",
    readyForGoogleDiscovery: true,
    blockers: [],
    warnings: ["EXPECTED_NOINDEX_PAGES_EXCLUDED"],
    summary: {
      publicIssueCount: 0,
      httpErrorCount: 0,
      reachablePageCount: 115,
      auditedPageCount: 115,
      googleDataState: "NO_DATA_YET",
      analyticsRowCount: 0,
    },
  }), {
    verdict: "READY_WAITING_FOR_SEARCH_CONSOLE_DATA",
    readyForGoogleDiscovery: true,
    blockers: [],
    warnings: ["EXPECTED_NOINDEX_PAGES_EXCLUDED"],
    publicIssueCount: 0,
    httpErrorCount: 0,
    reachablePageCount: 115,
    auditedPageCount: 115,
    googleDataState: "NO_DATA_YET",
    analyticsRowCount: 0,
  });
});
