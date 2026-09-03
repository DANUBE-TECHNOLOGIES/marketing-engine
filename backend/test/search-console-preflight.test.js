"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  fetchPublicSitemapXml,
  runSearchConsolePreflight,
} = require("../src/modules/search-console-submission/preflight");

function structuredDataService(readyToSubmit = true) {
  return {
    publicOrigin: "https://agences.example.test",
    async siteSitemapCandidate({ siteSlug }) {
      return {
        siteSlug,
        readyToSubmit,
        entryCount: readyToSubmit ? 8 : 0,
        readiness: {
          siteSlug,
          readyToSubmit,
          blockers: readyToSubmit ? [] : ["missing-indexable-site-root"],
          warnings: [],
        },
      };
    },
  };
}

function xmlResponse({ ok = true, status = 200, contentType = "application/xml", body } = {}) {
  return {
    ok,
    status,
    headers: {
      get(name) {
        return String(name).toLowerCase() === "content-type" ? contentType : null;
      },
    },
    async text() {
      return body || "<?xml version=\"1.0\"?><urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"><url><loc>https://agences.example.test/agence/gien</loc></url></urlset>";
    },
  };
}

test("public sitemap check accepts reachable sitemap XML", async () => {
  const result = await fetchPublicSitemapXml({
    sitemapUrl: "https://agences.example.test/agence/gien/sitemap.xml",
    fetchImpl: async () => xmlResponse(),
  });

  assert.equal(result.reachable, true);
  assert.equal(result.httpStatus, 200);
});

test("public sitemap check rejects a non XML response", async () => {
  await assert.rejects(
    fetchPublicSitemapXml({
      sitemapUrl: "https://agences.example.test/agence/gien/sitemap.xml",
      fetchImpl: async () => xmlResponse({ contentType: "text/html", body: "<html>bad gateway</html>" }),
    }),
    (error) => error.code === "SEARCH_CONSOLE_PUBLIC_SITEMAP_INVALID" && error.statusCode === 409
  );
});

test("preflight requires indexation readiness before checking Google", async () => {
  let ownerChecked = false;
  await assert.rejects(
    runSearchConsolePreflight({
      tenantId: "tenant-1",
      siteSlug: "gien",
      siteUrl: "sc-domain:agences.example.test",
      structuredDataService: structuredDataService(false),
      provider: {
        async assertSiteOwner() { ownerChecked = true; return {}; },
      },
      fetchImpl: async () => xmlResponse(),
    }),
    (error) => error.code === "SEARCH_CONSOLE_INDEXATION_NOT_READY"
  );
  assert.equal(ownerChecked, false);
});

test("preflight succeeds only when sitemap is public and property is owned", async () => {
  const result = await runSearchConsolePreflight({
    tenantId: "tenant-1",
    siteSlug: "gien",
    siteUrl: "sc-domain:agences.example.test",
    structuredDataService: structuredDataService(true),
    provider: {
      async assertSiteOwner(siteUrl) {
        return { siteUrl, permissionLevel: "siteOwner" };
      },
    },
    fetchImpl: async (url) => {
      assert.equal(url, "https://agences.example.test/agence/gien/sitemap.xml");
      return xmlResponse();
    },
  });

  assert.equal(result.ready, true);
  assert.equal(result.entryCount, 8);
  assert.equal(result.publicSitemap.reachable, true);
  assert.equal(result.searchConsoleProperty.owner, true);
});