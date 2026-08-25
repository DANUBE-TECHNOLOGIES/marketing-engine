"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SEARCH_CONSOLE_SCOPE,
  createState,
  verifyState,
  buildAuthorizationUrl,
} = require("../src/routes/searchConsoleOAuth");

test("Search Console OAuth state is signed and expires", () => {
  const previous = process.env.GOOGLE_CLIENT_SECRET;
  process.env.GOOGLE_CLIENT_SECRET = "test-secret";
  try {
    const state = createState(1000);
    assert.equal(verifyState(state, 1000 + 60_000), true);
    assert.equal(verifyState(state, 1000 + 11 * 60_000), false);
    assert.equal(verifyState(`${state}x`, 1000 + 60_000), false);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
    else process.env.GOOGLE_CLIENT_SECRET = previous;
  }
});

test("authorization URL requests readonly Search Console scope on existing callback", () => {
  const before = {
    client: process.env.GOOGLE_CLIENT_ID,
    secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect: process.env.GOOGLE_REDIRECT_URI,
  };
  process.env.GOOGLE_CLIENT_ID = "client-id";
  process.env.GOOGLE_CLIENT_SECRET = "client-secret";
  process.env.GOOGLE_REDIRECT_URI = "https://localengine.mondescale.com/api/google/callback";
  try {
    const url = new URL(buildAuthorizationUrl());
    assert.equal(url.searchParams.get("scope"), SEARCH_CONSOLE_SCOPE);
    assert.equal(url.searchParams.get("redirect_uri"), process.env.GOOGLE_REDIRECT_URI);
    assert.equal(url.searchParams.get("access_type"), "offline");
    assert.equal(url.searchParams.get("prompt"), "consent");
    assert.equal(verifyState(url.searchParams.get("state")), true);
  } finally {
    for (const [key, value] of Object.entries({ GOOGLE_CLIENT_ID: before.client, GOOGLE_CLIENT_SECRET: before.secret, GOOGLE_REDIRECT_URI: before.redirect })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
