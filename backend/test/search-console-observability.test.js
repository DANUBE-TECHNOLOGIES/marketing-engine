"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { SearchConsoleObservabilityService } = require("../src/modules/search-console-submission/observability");

test("observability compares local sitemap readiness with Google status", async () => {
  const calls = [];
  const structuredDataService = {
    publicOrigin: "https://agences.example.test",
    async siteSitemapCandidate({ tenantId, siteSlug }) {
      assert.equal(tenantId, "tenant-1");
      assert.equal(siteSlug, "gien");
      return {
        readyToSubmit: true,
        entryCount: 18,
        readiness: { readyToSubmit: true, blockers: [], warnings: [] },
      };
    },
  };
  const provider = {
    async getSitemap(payload) {
      calls.push(payload);
      return {
        path: payload.sitemapUrl,
        lastSubmitted: "2026-08-14T12:00:00Z",
        lastDownloaded: "2026-08-14T12:10:00Z",
        isPending: false,
        warnings: 1,
        errors: 0,
        contents: [
          { type: "web", submitted: 17 },
          { type: "image", submitted: 3 },
        ],
      };
    },
  };

  const service = new SearchConsoleObservabilityService({ structuredDataService, provider });
  const result = await service.sitemapStatus({
    tenantId: "tenant-1",
    siteSlug: "gien",
    siteUrl: "sc-domain:agences.example.test",
  });

  assert.deepEqual(calls, [{
    siteUrl: "sc-domain:agences.example.test",
    sitemapUrl: "https://agences.example.test/agence/gien/sitemap.xml",
  }]);
  assert.equal(result.local.readyToSubmit, true);
  assert.equal(result.local.entryCount, 18);
  assert.equal(result.google.submittedUrls, 20);
  assert.equal(result.google.processed, true);
  assert.equal(result.google.healthy, true);
  assert.equal(result.google.warnings, 1);
});

test("observability reports pending or erroneous sitemaps as not healthy", async () => {
  const service = new SearchConsoleObservabilityService({
    structuredDataService: {
      publicOrigin: "https://agences.example.test",
      async siteSitemapCandidate() {
        return { readyToSubmit: true, entryCount: 8, readiness: {} };
      },
    },
    provider: {
      async getSitemap() {
        return {
          path: "https://agences.example.test/agence/dax/sitemap.xml",
          isPending: true,
          warnings: 0,
          errors: 2,
          contents: [{ type: "web", submitted: 8 }],
        };
      },
    },
  });

  const result = await service.sitemapStatus({
    tenantId: "tenant-1",
    siteSlug: "dax",
    siteUrl: "sc-domain:agences.example.test",
  });

  assert.equal(result.google.processed, false);
  assert.equal(result.google.healthy, false);
  assert.equal(result.google.errors, 2);
});
