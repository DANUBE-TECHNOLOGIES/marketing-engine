"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RuntimeIndexabilityAuditService,
  fetchStableSitemap,
} = require("../src/modules/search-console-submission/runtime-indexability-audit");

function response({ url, status = 200, body = "", contentType = "application/xml" }) {
  return {
    url,
    status,
    ok: status >= 200 && status < 300,
    headers: { get(name) { return String(name).toLowerCase() === "content-type" ? contentType : null; } },
    async text() { return body; },
  };
}

test("MSE-25.84 retries once when first sitemap observation is HTTP 200 but empty", async () => {
  const url = "https://agences.mondescale.com/sitemap.xml";
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return response({ url, body: "<?xml version=\"1.0\"?><urlset></urlset>" });
    return response({ url, body: "<urlset><url><loc>https://agences.mondescale.com/agence/gien</loc></url></urlset>" });
  };

  const result = await fetchStableSitemap(fetchImpl, url, { expectedUrlCount: 1, timeoutMs: 1000 });

  assert.equal(calls, 2);
  assert.equal(result.retried, true);
  assert.equal(result.recovered, true);
  assert.deepEqual(result.urls, ["https://agences.mondescale.com/agence/gien"]);
  assert.equal(result.firstObservation.parsedUrlCount, 0);
});

test("MSE-25.84 does not retry a real HTTP sitemap failure", async () => {
  const url = "https://agences.mondescale.com/sitemap.xml";
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return response({ url, status: 502, body: "bad gateway", contentType: "text/plain" });
  };

  const result = await fetchStableSitemap(fetchImpl, url, { expectedUrlCount: 115, timeoutMs: 1000 });
  assert.equal(calls, 1);
  assert.equal(result.retried, false);
  assert.equal(result.recovered, false);
});

test("MSE-25.84 surfaces recovered transient sitemap read as a warning, not a blocker", async () => {
  const origin = "https://agences.mondescale.com";
  const expected = [`${origin}/agence/gien`];
  let sitemapCalls = 0;

  const fetchImpl = async (url) => {
    if (url.endsWith("/sitemap.xml")) {
      sitemapCalls += 1;
      if (sitemapCalls === 1) return response({ url, body: "<urlset></urlset>" });
      return response({ url, body: `<urlset><url><loc>${expected[0]}</loc></url></urlset>` });
    }
    if (url.endsWith("/robots.txt")) {
      return response({ url, body: `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml`, contentType: "text/plain" });
    }
    throw new Error(`unexpected ${url}`);
  };

  const structuredDataService = {
    publicOrigin: origin,
    async previewSitemap() { return { entries: expected.map((url) => ({ url })) }; },
  };

  const observer = {
    async audit() {
      return {
        summary: {
          observedUrlCount: 1,
          reachableCount: 1,
          fetchUnavailableCount: 0,
          publicIssueCount: 0,
          canonicalMismatchCount: 0,
          noindexCount: 0,
          robotsBlockedCount: 0,
          httpErrorCount: 0,
        },
        observations: [],
      };
    },
  };

  const service = new RuntimeIndexabilityAuditService({
    structuredDataService,
    publicIndexabilityObserver: observer,
    fetchImpl,
    timeoutMs: 1000,
  });

  const result = await service.audit({
    tenantId: "tenant",
    coverage: {
      sites: [{ pages: [{ reason: "SITEMAP_EXPOSED_WAITING_FOR_GOOGLE" }] }],
      searchConsole: { rowCount: 0, analyticsState: "NO_DATA_YET" },
    },
  });

  assert.equal(result.version, "mse-25.84");
  assert.equal(result.readyForGoogleDiscovery, true);
  assert.equal(result.verdict, "READY_WAITING_FOR_SEARCH_CONSOLE_DATA");
  assert.deepEqual(result.blockers, []);
  assert.ok(result.warnings.includes("TRANSIENT_EMPTY_SITEMAP_OBSERVATION_RECOVERED"));
  assert.equal(result.sitemap.observationRetried, true);
  assert.equal(result.sitemap.transientEmptyObservationRecovered, true);
  assert.equal(result.summary.publicSitemapUrlCount, 1);
});
