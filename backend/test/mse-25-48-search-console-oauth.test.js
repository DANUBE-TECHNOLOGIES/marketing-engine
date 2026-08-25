"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthUrl,
  BUSINESS_SCOPE,
} = require("../src/routes/googleOAuth");
const {
  buildAuthorizationUrl,
  createState,
  verifyState,
  SEARCH_CONSOLE_SCOPE,
} = require("../src/routes/searchConsoleOAuth");

function withOAuthEnv(run) {
  const previous = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    SEARCH_CONSOLE_OAUTH_STATE_SECRET: process.env.SEARCH_CONSOLE_OAUTH_STATE_SECRET,
  };
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_REDIRECT_URI = "https://localengine.mondescale.com/api/google/callback";
  process.env.SEARCH_CONSOLE_OAUTH_STATE_SECRET = "mse-25-48-oauth-test-secret";
  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Search Console OAuth uses its isolated readonly authorization builder and signed state", () => {
  withOAuthEnv(() => {
    const url = new URL(buildAuthorizationUrl());
    const state = url.searchParams.get("state");
    assert.equal(url.searchParams.get("scope"), "https://www.googleapis.com/auth/webmasters.readonly");
    assert.equal(SEARCH_CONSOLE_SCOPE, "https://www.googleapis.com/auth/webmasters.readonly");
    assert.equal(url.searchParams.get("redirect_uri"), "https://localengine.mondescale.com/api/google/callback");
    assert.equal(url.searchParams.get("access_type"), "offline");
    assert.equal(url.searchParams.get("prompt"), "consent");
    assert.ok(state);
    assert.equal(verifyState(state), true);
  });
});

test("Google Business OAuth remains isolated and never manufactures a Search Console state", () => {
  const url = new URL(buildAuthUrl({
    clientId: "client-id",
    redirectUri: "https://localengine.mondescale.com/api/google/callback",
    scope: BUSINESS_SCOPE,
  }));
  assert.equal(url.searchParams.get("scope"), "https://www.googleapis.com/auth/business.manage");
  assert.equal(url.searchParams.get("state"), null);
});

test("Search Console signed state is distinct from the Google Business no-state flow", () => {
  withOAuthEnv(() => {
    const state = createState();
    assert.ok(state);
    assert.equal(verifyState(state), true);
    const businessUrl = new URL(buildAuthUrl({
      clientId: "client-id",
      redirectUri: "https://localengine.mondescale.com/api/google/callback",
      scope: BUSINESS_SCOPE,
    }));
    assert.equal(businessUrl.searchParams.has("state"), false);
  });
});
