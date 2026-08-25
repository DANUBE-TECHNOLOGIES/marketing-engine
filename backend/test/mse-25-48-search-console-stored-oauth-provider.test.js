"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  SEARCH_CONSOLE_TOKEN_PROVIDER,
  createStoredSearchConsoleAccessTokenProvider,
} = require("../src/modules/search-console-submission/auth");
const {
  createConfiguredSearchConsoleProvider,
} = require("../src/modules/search-console-submission/config");
const {
  GoogleSearchConsoleProvider,
} = require("../src/modules/search-console-submission/provider");

function prismaWithToken(token) {
  const calls = { findFirst: [], update: [] };
  return {
    calls,
    googleToken: {
      async findFirst(args) {
        calls.findFirst.push(args);
        return token;
      },
      async update(args) {
        calls.update.push(args);
        return { ...token, ...args.data };
      },
    },
  };
}

test("MSE-25.48 stored OAuth reads only the isolated search-console provider", async () => {
  const now = 1_000_000;
  const prisma = prismaWithToken({
    id: "token-1",
    provider: SEARCH_CONSOLE_TOKEN_PROVIDER,
    accessToken: "fresh-access",
    refreshToken: "refresh",
    expiryDate: BigInt(now + 10 * 60_000),
  });
  const accessToken = createStoredSearchConsoleAccessTokenProvider({ prisma, now: () => now });
  assert.equal(await accessToken(), "fresh-access");
  assert.deepEqual(prisma.calls.findFirst[0].where, { provider: "search-console" });
  assert.equal(prisma.calls.update.length, 0);
});

test("MSE-25.48 stored OAuth refreshes an expired Search Console token and updates only its row", async () => {
  const now = 2_000_000;
  const prisma = prismaWithToken({
    id: "token-2",
    provider: "search-console",
    accessToken: "expired-access",
    refreshToken: "isolated-refresh",
    expiryDate: BigInt(now - 1),
  });
  let request = null;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      async json() { return { access_token: "new-access", expires_in: 3600 }; },
    };
  };
  const accessToken = createStoredSearchConsoleAccessTokenProvider({
    prisma,
    env: { GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: "secret" },
    fetchImpl,
    now: () => now,
  });
  assert.equal(await accessToken(), "new-access");
  assert.equal(request.url, "https://oauth2.googleapis.com/token");
  assert.match(String(request.options.body), /refresh_token=isolated-refresh/);
  assert.equal(prisma.calls.update.length, 1);
  assert.deepEqual(prisma.calls.update[0].where, { id: "token-2" });
  assert.equal(prisma.calls.update[0].data.accessToken, "new-access");
});

test("MSE-25.48 enabled provider defaults to DB OAuth and stays read-only", () => {
  const prisma = prismaWithToken(null);
  const provider = createConfiguredSearchConsoleProvider({
    prisma,
    env: { SEARCH_CONSOLE_ENABLED: "true" },
    fetchImpl: async () => ({ ok: true, json: async () => ({}) }),
  });
  assert.equal(provider.name, "google-search-console");
  assert.equal(provider.credentialMode, "oauth-db-token");
  assert.equal(provider.accessMode, "read-only");
  assert.equal(provider.submissionCapable, false);
});

test("MSE-25.48 readonly provider hard-blocks any sitemap submission before Google is called", async () => {
  let googleCalls = 0;
  const provider = new GoogleSearchConsoleProvider({
    accessTokenProvider: async () => "token",
    fetchImpl: async () => { googleCalls += 1; return { ok: true, status: 200, json: async () => ({}) }; },
    accessMode: "read-only",
    submissionCapable: false,
  });
  await assert.rejects(
    provider.submitSitemap({ siteUrl: "sc-domain:agences.mondescale.com", sitemapUrl: "https://agences.mondescale.com/sitemap.xml" }),
    (error) => error.code === "SEARCH_CONSOLE_PROVIDER_READ_ONLY"
  );
  assert.equal(googleCalls, 0);
});

test("MSE-25.48 mounts isolated OAuth before tenant middleware and injects prisma into provider", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/modules/register-modules.js"), "utf8");
  const oauthMount = source.indexOf("app.use(createSearchConsoleOAuthRoutes(prisma))");
  const tenantMount = source.indexOf("app.use(tenantCore.createTenantMiddleware");
  assert.ok(oauthMount >= 0);
  assert.ok(tenantMount > oauthMount);
  assert.match(source, /createConfiguredSearchConsoleProvider\(\{ prisma \}\)/);
});
