"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildAuthUrl,
  resolveProvider,
  BUSINESS_SCOPE,
  SEARCH_CONSOLE_SCOPE,
  SEARCH_CONSOLE_STATE,
} = require("../src/routes/googleOAuth");

test("Search Console OAuth reuses client redirect but requests readonly scope and distinct state", () => {
  const url = new URL(buildAuthUrl({
    clientId: "client-id",
    redirectUri: "https://localengine.mondescale.com/api/google/callback",
    scope: SEARCH_CONSOLE_SCOPE,
    state: SEARCH_CONSOLE_STATE,
  }));
  assert.equal(url.searchParams.get("scope"), "https://www.googleapis.com/auth/webmasters.readonly");
  assert.equal(url.searchParams.get("state"), SEARCH_CONSOLE_STATE);
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("prompt"), "consent");
  assert.equal(resolveProvider(SEARCH_CONSOLE_STATE), "search-console");
});

test("Google Business OAuth remains isolated from Search Console provider", () => {
  const url = new URL(buildAuthUrl({ clientId: "client-id", redirectUri: "https://localengine.mondescale.com/api/google/callback", scope: BUSINESS_SCOPE }));
  assert.equal(url.searchParams.get("scope"), "https://www.googleapis.com/auth/business.manage");
  assert.equal(url.searchParams.get("state"), null);
  assert.equal(resolveProvider(undefined), "google");
});
