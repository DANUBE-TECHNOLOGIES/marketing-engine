"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  SEARCH_CONSOLE_SCOPE,
  createGoogleAccessTokenProvider,
} = require("../src/modules/search-console-submission/auth");

test("Google auth provider requests the Search Console webmasters scope and caches the client", async () => {
  const constructions = [];
  let getClientCalls = 0;

  class FakeGoogleAuth {
    constructor(options) {
      constructions.push(options);
    }
    async getClient() {
      getClientCalls += 1;
      return {
        async getAccessToken() {
          return { token: "access-123" };
        },
      };
    }
  }

  const tokenProvider = createGoogleAccessTokenProvider({
    GoogleAuth: FakeGoogleAuth,
    credentials: { client_email: "search-console@example.test" },
  });

  assert.equal(await tokenProvider(), "access-123");
  assert.equal(await tokenProvider(), "access-123");
  assert.equal(constructions.length, 1);
  assert.equal(getClientCalls, 1);
  assert.deepEqual(constructions[0].scopes, [SEARCH_CONSOLE_SCOPE]);
  assert.equal(constructions[0].credentials.client_email, "search-console@example.test");
});

test("Google auth provider fails clearly when no access token is returned", async () => {
  class EmptyGoogleAuth {
    async getClient() {
      return { async getAccessToken() { return null; } };
    }
  }

  const tokenProvider = createGoogleAccessTokenProvider({ GoogleAuth: EmptyGoogleAuth });
  await assert.rejects(
    tokenProvider(),
    (error) => error.code === "SEARCH_CONSOLE_ACCESS_TOKEN_UNAVAILABLE" && error.statusCode === 503
  );
});