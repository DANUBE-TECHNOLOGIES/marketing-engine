"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const {
  createSearchConsoleOAuthRoutes,
  createState,
  verifyState,
  SEARCH_CONSOLE_SCOPE,
} = require("../src/routes/searchConsoleOAuth");
const {
  GoogleSearchConsoleProvider,
} = require("../src/modules/search-console-submission/provider");
const {
  createConfiguredSearchConsoleProvider,
} = require("../src/modules/search-console-submission/config");

const READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TEST_PROPERTY = "sc-domain:mondescale.com";

function mockPrisma(token = null) {
  return {
    googleToken: {
      findFirst: async () => token,
      update: async ({ data }) => ({ ...(token || {}), ...data }),
    },
  };
}

async function withServer(router, run) {
  const app = express();
  app.use(router);
  const server = await new Promise((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function readJson(baseUrl, path) {
  const response = await fetch(`${baseUrl}${path}`);
  return { response, body: await response.json() };
}

test("MSE-25.48 signed OAuth state is readonly, time-bounded and tamper-resistant", () => {
  const previousSecret = process.env.SEARCH_CONSOLE_OAUTH_STATE_SECRET;
  process.env.SEARCH_CONSOLE_OAUTH_STATE_SECRET = "mse-25-48-test-secret";
  try {
    assert.equal(SEARCH_CONSOLE_SCOPE, READONLY_SCOPE);
    const now = 1_800_000_000_000;
    const state = createState(now);
    assert.equal(verifyState(state, now + 60_000), true);
    assert.equal(verifyState(`${state}x`, now + 60_000), false);
    assert.equal(verifyState(state, now + (11 * 60_000)), false);
    assert.equal(verifyState(state, now - 1), false);
  } finally {
    if (previousSecret === undefined) delete process.env.SEARCH_CONSOLE_OAUTH_STATE_SECRET;
    else process.env.SEARCH_CONSOLE_OAUTH_STATE_SECRET = previousSecret;
  }
});

test("MSE-25.48 OAuth DB provider remains structurally unable to submit", async () => {
  const provider = createConfiguredSearchConsoleProvider({
    env: { SEARCH_CONSOLE_ENABLED: "true", SEARCH_CONSOLE_AUTH_MODE: "oauth-db-token" },
    prisma: mockPrisma({ refreshToken: "refresh", accessToken: "access", expiryDate: BigInt(Date.now() + 300_000) }),
    fetchImpl: async () => { throw new Error("network must not be reached"); },
  });

  assert.equal(provider.accessMode, "read-only");
  assert.equal(provider.submissionCapable, false);
  await assert.rejects(
    () => provider.submitSitemap({ siteUrl: TEST_PROPERTY, sitemapUrl: "https://mondescale.com/sitemap.xml" }),
    (error) => error?.code === "SEARCH_CONSOLE_PROVIDER_READ_ONLY" && error?.statusCode === 409
  );
});

test("MSE-25.48 readiness HTTP contract distinguishes disabled, missing token, inaccessible property and ready", async () => {
  const previousEnabled = process.env.SEARCH_CONSOLE_ENABLED;
  const previousProperty = process.env.SEARCH_CONSOLE_PROPERTY;
  process.env.SEARCH_CONSOLE_PROPERTY = TEST_PROPERTY;

  try {
    process.env.SEARCH_CONSOLE_ENABLED = "false";
    await withServer(createSearchConsoleOAuthRoutes(mockPrisma(null)), async (baseUrl) => {
      const { response, body } = await readJson(baseUrl, "/search-console/readiness");
      assert.equal(response.status, 200);
      assert.equal(body.state, "feature-disabled");
      assert.equal(body.ready, false);
      assert.equal(body.submissionCapable, false);
      assert.equal(body.accessMode, "read-only");
    });

    process.env.SEARCH_CONSOLE_ENABLED = "true";
    await withServer(createSearchConsoleOAuthRoutes(mockPrisma(null)), async (baseUrl) => {
      const { response, body } = await readJson(baseUrl, "/search-console/readiness");
      assert.equal(response.status, 200);
      assert.equal(body.state, "oauth-token-missing");
      assert.equal(body.ready, false);
      assert.equal(body.property, TEST_PROPERTY);
      assert.equal(body.submissionCapable, false);
    });

    const token = {
      id: "sc-token",
      refreshToken: "refresh-token",
      accessToken: "access-token",
      expiryDate: BigInt(Date.now() + 300_000),
    };

    const inaccessibleFetch = async (url) => {
      assert.match(String(url), /\/webmasters\/v3\/sites$/);
      return {
        ok: true,
        status: 200,
        json: async () => ({ siteEntry: [{ siteUrl: "sc-domain:other.example", permissionLevel: "siteOwner" }] }),
      };
    };
    await withServer(createSearchConsoleOAuthRoutes(mockPrisma(token), { fetchImpl: inaccessibleFetch }), async (baseUrl) => {
      const { response, body } = await readJson(baseUrl, "/search-console/readiness");
      assert.equal(response.status, 200);
      assert.equal(body.state, "property-not-accessible");
      assert.equal(body.ready, false);
      assert.equal(body.accessiblePropertyCount, 1);
      assert.equal(body.submissionCapable, false);
    });

    const readyFetch = async (url) => {
      assert.match(String(url), /\/webmasters\/v3\/sites$/);
      return {
        ok: true,
        status: 200,
        json: async () => ({ siteEntry: [{ siteUrl: TEST_PROPERTY, permissionLevel: "siteOwner" }] }),
      };
    };
    await withServer(createSearchConsoleOAuthRoutes(mockPrisma(token), { fetchImpl: readyFetch }), async (baseUrl) => {
      const { response, body } = await readJson(baseUrl, "/search-console/readiness");
      assert.equal(response.status, 200);
      assert.equal(body.state, "read-only-ready");
      assert.equal(body.ready, true);
      assert.equal(body.propertyAccess.siteUrl, TEST_PROPERTY);
      assert.equal(body.propertyAccess.permissionLevel, "siteOwner");
      assert.equal(body.submissionCapable, false);
      assert.equal(body.autoSubmit, false);
      assert.equal(body.explicitApprovalRequired, true);
    });
  } finally {
    if (previousEnabled === undefined) delete process.env.SEARCH_CONSOLE_ENABLED;
    else process.env.SEARCH_CONSOLE_ENABLED = previousEnabled;
    if (previousProperty === undefined) delete process.env.SEARCH_CONSOLE_PROPERTY;
    else process.env.SEARCH_CONSOLE_PROPERTY = previousProperty;
  }
});

test("MSE-25.48 a readonly provider rejects submission before token or Google network access", async () => {
  let tokenCalls = 0;
  let fetchCalls = 0;
  const provider = new GoogleSearchConsoleProvider({
    accessMode: "read-only",
    submissionCapable: false,
    accessTokenProvider: async () => { tokenCalls += 1; return "forbidden"; },
    fetchImpl: async () => { fetchCalls += 1; throw new Error("forbidden"); },
  });

  await assert.rejects(
    () => provider.submitSitemap({ siteUrl: TEST_PROPERTY, sitemapUrl: "https://mondescale.com/sitemap.xml" }),
    (error) => error?.code === "SEARCH_CONSOLE_PROVIDER_READ_ONLY"
  );
  assert.equal(tokenCalls, 0);
  assert.equal(fetchCalls, 0);
});
