const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const { createConfiguredSearchConsoleProvider } = require("../src/modules/search-console-submission/config");
const { createPersistentOAuthAccessTokenProvider } = require("../src/modules/search-console-submission/auth");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function prismaWithToken(token, onUpdate = async () => {}) {
  return {
    googleToken: {
      findFirst: async () => token,
      update: async (args) => {
        await onUpdate(args);
        return { ...token, ...args.data };
      },
    },
  };
}

test("MSE-25.80 persistent OAuth is authoritative when Prisma is available", () => {
  const prisma = prismaWithToken(null);
  const provider = createConfiguredSearchConsoleProvider({
    env: { SEARCH_CONSOLE_ENABLED: "true" },
    prisma,
    fetchImpl: async () => { throw new Error("unexpected fetch"); },
  });

  assert.equal(provider.name, "google-search-console");
  assert.equal(provider.credentialMode, "persistent-oauth-token");
  assert.equal(provider.requestedEnabled, true);
  assert.equal(provider.disabledReason, null);
});

test("MSE-25.80 persistent provider reuses a non-expired access token without refresh", async () => {
  let refreshCalls = 0;
  const now = 1_700_000_000_000;
  const provider = createPersistentOAuthAccessTokenProvider({
    prisma: prismaWithToken({
      id: "gsc-token",
      provider: "search-console",
      accessToken: "cached-token",
      refreshToken: "refresh-token",
      expiryDate: BigInt(now + 10 * 60 * 1000),
      createdAt: new Date(),
    }),
    env: {},
    now: () => now,
    fetchImpl: async () => {
      refreshCalls += 1;
      throw new Error("refresh should not run");
    },
  });

  assert.equal(await provider(), "cached-token");
  assert.equal(refreshCalls, 0);
});

test("MSE-25.80 persistent provider refreshes an expired Search Console token and persists it", async () => {
  const now = 1_700_000_000_000;
  let updated = null;
  let requestedBody = null;
  const prisma = prismaWithToken({
    id: "gsc-token",
    provider: "search-console",
    accessToken: "expired-token",
    refreshToken: "refresh-token",
    expiryDate: BigInt(now - 1),
    createdAt: new Date(),
  }, async (args) => { updated = args; });

  const provider = createPersistentOAuthAccessTokenProvider({
    prisma,
    env: { GOOGLE_CLIENT_ID: "client-id", GOOGLE_CLIENT_SECRET: "client-secret" },
    now: () => now,
    fetchImpl: async (_url, options) => {
      requestedBody = String(options.body);
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "fresh-token", expires_in: 3600 }),
      };
    },
  });

  assert.equal(await provider(), "fresh-token");
  assert.match(requestedBody, /grant_type=refresh_token/);
  assert.match(requestedBody, /refresh_token=refresh-token/);
  assert.equal(updated.where.id, "gsc-token");
  assert.equal(updated.data.accessToken, "fresh-token");
  assert.equal(updated.data.expiryDate, BigInt(now + 3600 * 1000));
});

test("MSE-25.80 persistent provider refuses to fall back silently when Search Console refresh token is absent", async () => {
  const provider = createPersistentOAuthAccessTokenProvider({
    prisma: prismaWithToken(null),
    env: { GOOGLE_CLIENT_ID: "client-id", GOOGLE_CLIENT_SECRET: "client-secret" },
    fetchImpl: async () => { throw new Error("unexpected fetch"); },
  });

  await assert.rejects(provider(), (error) => {
    assert.equal(error.code, "SEARCH_CONSOLE_REFRESH_TOKEN_UNAVAILABLE");
    return true;
  });
});

test("MSE-25.80 legacy Google OAuth no longer owns Search Console", () => {
  const legacy = read("src/routes/googleOAuth.js");

  assert.doesNotMatch(legacy, /\/search-console\/auth/);
  assert.doesNotMatch(legacy, /\/search-console\/token-status/);
  assert.doesNotMatch(legacy, /SEARCH_CONSOLE_STATE/);
  assert.doesNotMatch(legacy, /provider:\s*["']search-console["']/);
  assert.match(legacy, /if \(req\.query\.state\) return next\(\)/);
  assert.match(legacy, /provider:\s*["']google["']/);
});

test("MSE-25.80 isolated OAuth owns Search Console and keeps controlled write scope", () => {
  const isolated = read("src/routes/searchConsoleOAuth.js");

  assert.match(isolated, /\/search-console\/auth/);
  assert.match(isolated, /https:\/\/www\.googleapis\.com\/auth\/webmasters["']/);
  assert.match(isolated, /createHmac/);
  assert.match(isolated, /randomBytes/);
  assert.match(isolated, /provider:\s*["']search-console["']/);
});

test("MSE-25.80 isolated Search Console OAuth is mounted before provider routes and receives Prisma", () => {
  const register = read("src/modules/register-modules.js");

  assert.match(register, /createSearchConsoleOAuthRoutes/);
  assert.match(register, /app\.use\(createSearchConsoleOAuthRoutes\(prisma\)\)/);
  assert.match(register, /createConfiguredSearchConsoleProvider\(\{ prisma \}\)/);
  assert.ok(
    register.indexOf("app.use(createSearchConsoleOAuthRoutes(prisma))") <
      register.indexOf("createConfiguredSearchConsoleProvider({ prisma })"),
    "isolated OAuth must be mounted before Search Console submission routes"
  );
});

test("MSE-25.80 health exposes the active credential mode without enabling auto-submit", () => {
  const routes = read("src/modules/search-console-submission/routes.js");

  assert.match(routes, /credentialMode:active\?\.credentialMode\|\|null/);
  assert.match(routes, /explicitApprovalRequired:true/);
  assert.match(routes, /autoSubmit:false/);
});
