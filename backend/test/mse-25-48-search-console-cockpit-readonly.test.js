"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.48 Google Business OAuth no longer owns Search Console routes", () => {
  const googleOAuth = source("backend/src/routes/googleOAuth.js");
  assert.doesNotMatch(googleOAuth, /\/search-console\/auth/);
  assert.doesNotMatch(googleOAuth, /provider:\s*"search-console"/);
  assert.match(googleOAuth, /if \(req\.query\.state\) return next\(\)/);
});

test("MSE-25.48 isolated Search Console OAuth uses signed readonly state", () => {
  const searchConsoleOAuth = source("backend/src/routes/searchConsoleOAuth.js");
  assert.match(searchConsoleOAuth, /webmasters\.readonly/);
  assert.match(searchConsoleOAuth, /createHmac\("sha256"/);
  assert.match(searchConsoleOAuth, /verifyState\(req\.query\.state\)/);
  assert.match(searchConsoleOAuth, /provider:\s*SEARCH_CONSOLE_PROVIDER/);
});

test("MSE-25.48 frontend callback preserves the signed OAuth state", () => {
  const callback = source("frontend/app/api/google/callback/route.js");
  assert.match(callback, /incoming\.searchParams\.entries\(\)/);
  assert.match(callback, /backendUrl\.searchParams\.append\(key, value\)/);
});

test("MSE-25.48 cockpit loads explicit Search Console readiness", () => {
  const api = source("frontend/lib/indexation-api.js");
  const proxy = source("frontend/app/api/indexation/route.js");
  const cockpit = source("frontend/app/indexation/IndexationCockpitClient.js");

  assert.match(api, /readiness:\s*\(\)\s*=>\s*read\("readiness"\)/);
  assert.match(proxy, /readiness:\s*"\/api\/search-console\/readiness"/);
  assert.match(cockpit, /indexationApi\.readiness\(\)/);
  assert.match(cockpit, /read-only-ready/);
  assert.match(cockpit, /Connecter Search Console/);
  assert.match(cockpit, /\/api\/search-console\/auth/);
});

test("MSE-25.48 cockpit never exposes Google submission for readonly provider", () => {
  const cockpit = source("frontend/app/indexation/IndexationCockpitClient.js");
  const provider = source("backend/src/modules/search-console-submission/provider.js");

  assert.match(cockpit, /run\?\.status === "approved" && submissionCapable/);
  assert.match(cockpit, /Écriture Google désactivée/);
  assert.match(provider, /submissionCapable === false/);
  assert.match(provider, /SEARCH_CONSOLE_PROVIDER_READ_ONLY/);
});
