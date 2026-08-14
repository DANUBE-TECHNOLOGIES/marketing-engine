"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  GoogleSearchConsoleProvider,
  SEARCH_CONSOLE_API_ROOT,
} = require("../src/modules/search-console-submission/provider");

test("google provider submits sitemap with encoded Search Console property and feedpath", async () => {
  const calls = [];
  const provider = new GoogleSearchConsoleProvider({
    accessTokenProvider: async () => "token-123",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 204 };
    },
  });

  const result = await provider.submitSitemap({
    siteUrl: "sc-domain:agences.example.test",
    sitemapUrl: "https://agences.example.test/sitemaps/gien.xml",
  });

  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    `${SEARCH_CONSOLE_API_ROOT}/sites/${encodeURIComponent("sc-domain:agences.example.test")}/sitemaps/${encodeURIComponent("https://agences.example.test/sitemaps/gien.xml")}`
  );
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[0].options.headers.Authorization, "Bearer token-123");
  assert.equal(result.provider, "google-search-console");
  assert.equal(result.httpStatus, 204);
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
    provider.submitSitemap({
      siteUrl: "sc-domain:agences.example.test",
      sitemapUrl: "https://agences.example.test/sitemap.xml",
    }),
    (error) => error.code === "SEARCH_CONSOLE_API_ERROR" && error.statusCode === 403 && error.details?.error?.message === "forbidden"
  );
});