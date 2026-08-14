"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GoogleSearchConsoleProvider,
  SEARCH_CONSOLE_API_ROOT,
} = require("../src/modules/search-console-submission/provider");

test("google provider verifies owner permission before submitting sitemap", async () => {
  const calls = [];
  const provider = new GoogleSearchConsoleProvider({
    accessTokenProvider: async () => "token-123",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url === `${SEARCH_CONSOLE_API_ROOT}/sites`) {
        return {
          ok: true,
          status: 200,
          async json() {
            return { siteEntry: [{ siteUrl: "sc-domain:agences.example.test", permissionLevel: "siteOwner" }] };
          },
        };
      }
      return { ok: true, status: 204 };
    },
  });

  const result = await provider.submitSitemap({
    siteUrl: "sc-domain:agences.example.test",
    sitemapUrl: "https://agences.example.test/sitemaps/gien.xml",
  });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, `${SEARCH_CONSOLE_API_ROOT}/sites`);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(
    calls[1].url,
    `${SEARCH_CONSOLE_API_ROOT}/sites/${encodeURIComponent("sc-domain:agences.example.test")}/sitemaps/${encodeURIComponent("https://agences.example.test/sitemaps/gien.xml")}`
  );
  assert.equal(calls[1].options.method, "PUT");
  assert.equal(calls[1].options.headers.Authorization, "Bearer token-123");
  assert.equal(result.provider, "google-search-console");
  assert.equal(result.permissionLevel, "siteOwner");
  assert.equal(result.httpStatus, 204);
});

test("google provider refuses a Search Console property that is not accessible", async () => {
  const provider = new GoogleSearchConsoleProvider({
    accessTokenProvider: async () => "token-123",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() { return { siteEntry: [{ siteUrl: "sc-domain:other.example.test", permissionLevel: "siteOwner" }] }; },
    }),
  });

  await assert.rejects(
    provider.submitSitemap({
      siteUrl: "sc-domain:agences.example.test",
      sitemapUrl: "https://agences.example.test/sitemap.xml",
    }),
    (error) => error.code === "SEARCH_CONSOLE_SITE_NOT_ACCESSIBLE" && error.statusCode === 403
  );
});

test("google provider refuses non-owner permissions for sitemap submission", async () => {
  const provider = new GoogleSearchConsoleProvider({
    accessTokenProvider: async () => "token-123",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return { siteEntry: [{ siteUrl: "sc-domain:agences.example.test", permissionLevel: "siteFullUser" }] };
      },
    }),
  });

  await assert.rejects(
    provider.submitSitemap({
      siteUrl: "sc-domain:agences.example.test",
      sitemapUrl: "https://agences.example.test/sitemap.xml",
    }),
    (error) => error.code === "SEARCH_CONSOLE_OWNER_PERMISSION_REQUIRED"
      && error.statusCode === 403
      && error.details?.permissionLevel === "siteFullUser"
  );
});

test("google provider surfaces Search Console API errors without hiding details", async () => {
  const provider = new GoogleSearchConsoleProvider({
    accessTokenProvider: async () => "token-123",
    fetchImpl: async () => ({
      ok: false,
      status: 403,
      async json() { return { error: { message: "forbidden" } }; },
    }),
  });

  await assert.rejects(
    provider.listSites(),
    (error) => error.code === "SEARCH_CONSOLE_API_ERROR" && error.statusCode === 403 && error.details?.error?.message === "forbidden"
  );
});