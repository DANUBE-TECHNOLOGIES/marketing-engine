"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { RuntimeIndexabilityAuditService, parseSitemapUrls, sitemapDirective } = require("../src/modules/search-console-submission/runtime-indexability-audit");

function response({ url, status = 200, body = "", contentType = "text/plain" }) {
  return {
    url,
    status,
    ok: status >= 200 && status < 300,
    headers: { get(name) { return String(name).toLowerCase() === "content-type" ? contentType : null; } },
    async text() { return body; },
  };
}

function service({ sitemapStatus = 200, sitemapBody, robotsStatus = 200, robotsBody, pageAudit, coverage } = {}) {
  const origin = "https://agences.mondescale.com";
  const expected = [
    `${origin}/agence/dax`,
    `${origin}/agence/gien`,
  ];
  const fetchImpl = async (url) => {
    if (url.endsWith("/sitemap.xml")) return response({ url, status: sitemapStatus, body: sitemapBody ?? `<?xml version="1.0"?><urlset><url><loc>${expected[0]}</loc></url><url><loc>${expected[1]}</loc></url></urlset>`, contentType: "application/xml" });
    if (url.endsWith("/robots.txt")) return response({ url, status: robotsStatus, body: robotsBody ?? `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml` });
    throw new Error(`unexpected ${url}`);
  };
  const structuredDataService = {
    publicOrigin: origin,
    async previewSitemap() { return { entries: expected.map((url) => ({ url })) }; },
  };
  const publicIndexabilityObserver = {
    async audit() {
      return pageAudit || {
        summary: { observedUrlCount: 2, reachableCount: 2, fetchUnavailableCount: 0, publicIssueCount: 0, canonicalMismatchCount: 0, noindexCount: 0, robotsBlockedCount: 0, httpErrorCount: 0 },
        observations: [],
      };
    },
  };
  return { auditService: new RuntimeIndexabilityAuditService({ structuredDataService, publicIndexabilityObserver, fetchImpl }), coverage: coverage || { sites: [{ pages: [{ reason: "SITEMAP_EXPOSED_WAITING_FOR_GOOGLE" }, { reason: "SITEMAP_EXPOSED_WAITING_FOR_GOOGLE" }] }], analyticsRowCount: 0, dataState: "NO_DATA_YET" } };
}

test("MSE-25.74 parses sitemap URLs and robots sitemap directives", () => {
  assert.deepEqual(parseSitemapUrls("<urlset><url><loc>https://example.test/a?x=1&amp;y=2</loc></url></urlset>"), ["https://example.test/a"]);
  assert.deepEqual(sitemapDirective("User-agent: *\nSitemap: https://example.test/sitemap.xml"), ["https://example.test/sitemap.xml"]);
});

test("MSE-25.74 reports ready while Search Console has no data yet", async () => {
  const setup = service();
  const result = await setup.auditService.audit({ tenantId: "tenant", coverage: setup.coverage });
  assert.equal(result.verdict, "READY_WAITING_FOR_SEARCH_CONSOLE_DATA");
  assert.equal(result.readyForGoogleDiscovery, true);
  assert.equal(result.summary.expectedSitemapUrlCount, 2);
  assert.equal(result.summary.publicSitemapUrlCount, 2);
  assert.equal(result.summary.reachablePageCount, 2);
  assert.equal(result.robots.declaresPublicSitemap, true);
  assert.deepEqual(result.blockers, []);
  assert.equal(result.invariants.googleWrites, false);
});

test("MSE-25.74 blocks when public sitemap misses an expected URL", async () => {
  const setup = service({ sitemapBody: `<urlset><url><loc>https://agences.mondescale.com/agence/dax</loc></url></urlset>` });
  const result = await setup.auditService.audit({ tenantId: "tenant", coverage: setup.coverage });
  assert.equal(result.verdict, "BLOCKED_INDEXABILITY");
  assert.equal(result.readyForGoogleDiscovery, false);
  assert.equal(result.summary.missingFromPublicSitemapCount, 1);
  assert.ok(result.blockers.includes("PUBLIC_SITEMAP_MISSING_EXPECTED_URLS"));
});

test("MSE-25.74 treats a missing robots.txt as non-blocking but visible", async () => {
  const setup = service({ robotsStatus: 404, robotsBody: "" });
  const result = await setup.auditService.audit({ tenantId: "tenant", coverage: setup.coverage });
  assert.equal(result.robots.absentAllowByDefault, true);
  assert.equal(result.readyForGoogleDiscovery, true);
  assert.equal(result.blockers.includes("ROBOTS_OBSERVATION_UNAVAILABLE"), false);
});

test("MSE-25.74 blocks true public page indexability issues", async () => {
  const setup = service({ pageAudit: { summary: { observedUrlCount: 2, reachableCount: 1, fetchUnavailableCount: 0, publicIssueCount: 1, canonicalMismatchCount: 1, noindexCount: 0, robotsBlockedCount: 0, httpErrorCount: 0 }, observations: [] } });
  const result = await setup.auditService.audit({ tenantId: "tenant", coverage: setup.coverage });
  assert.equal(result.verdict, "BLOCKED_INDEXABILITY");
  assert.ok(result.blockers.includes("PUBLIC_PAGE_INDEXABILITY_ISSUES"));
});
