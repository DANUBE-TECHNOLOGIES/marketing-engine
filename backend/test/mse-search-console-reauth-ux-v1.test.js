const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createPersistentOAuthAccessTokenProvider,
} = require("../src/modules/search-console-submission/auth");

function prismaWithSearchToken(token) {
  return {
    googleToken: {
      findFirst: async () => token,
      update: async () => {
        throw new Error("update must not be called on invalid_grant");
      },
    },
  };
}

test("Search Console invalid_grant becomes an explicit reauth error", async () => {
  const provider = createPersistentOAuthAccessTokenProvider({
    prisma: prismaWithSearchToken({
      id: 8,
      provider: "search-console",
      accessToken: "expired-access",
      refreshToken: "expired-refresh",
      expiryDate: BigInt(1),
      createdAt: new Date(),
    }),
    env: {
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
    },
    now: () => 2000,
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: "invalid_grant",
        error_description: "Token has been expired or revoked.",
      }),
    }),
  });

  await assert.rejects(
    provider(),
    (error) => {
      assert.equal(error.code, "SEARCH_CONSOLE_REAUTH_REQUIRED");
      assert.equal(error.statusCode, 401);
      assert.equal(error.reauthRequired, true);
      assert.equal(error.reauthUrl, "/api/search-console/auth");

      // Do not propagate Google's token/revocation details through
      // the dedicated reauthentication error.
      assert.equal(error.details, undefined);

      return true;
    }
  );
});

test("other Search Console refresh failures keep generic refresh failure", async () => {
  const provider = createPersistentOAuthAccessTokenProvider({
    prisma: prismaWithSearchToken({
      id: 8,
      provider: "search-console",
      accessToken: "expired-access",
      refreshToken: "refresh",
      expiryDate: BigInt(1),
      createdAt: new Date(),
    }),
    env: {
      GOOGLE_CLIENT_ID: "client-id",
      GOOGLE_CLIENT_SECRET: "client-secret",
    },
    now: () => 2000,
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      json: async () => ({
        error: "server_error",
      }),
    }),
  });

  await assert.rejects(
    provider(),
    (error) => {
      assert.equal(error.code, "SEARCH_CONSOLE_TOKEN_REFRESH_FAILED");
      assert.equal(error.statusCode, 500);
      return true;
    }
  );
});
