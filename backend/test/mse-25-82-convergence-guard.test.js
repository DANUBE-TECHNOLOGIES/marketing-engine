"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("MSE-25.82 preserves runtime readiness and OAuth provider wiring", () => {
  const routes = read("backend/src/modules/search-console-submission/routes.js");
  const register = read("backend/src/modules/register-modules.js");

  assert.match(routes, /search-console-submissions\/runtime-readiness/);
  assert.match(routes, /createSearchConsoleProvider\(\{prisma\}\)/);
  assert.match(routes, /providerTransportConfigured/);
  assert.match(register, /searchConsoleSubmission/);
});

test("MSE-25.82 preserves internal public indexability transport", () => {
  const compose = read("docker-compose.yml");
  const routes = read("backend/src/modules/search-console-submission/routes.js");

  assert.match(compose, /PUBLIC_INDEXABILITY_FETCH_ORIGIN/);
  assert.match(compose, /http:\/\/frontend:3000/);
  assert.match(compose, /PUBLIC_INDEXABILITY_TIMEOUT_MS/);
  assert.match(compose, /PUBLIC_INDEXABILITY_CONCURRENCY/);
  assert.match(routes, /createRuntimeFetchTransport/);
});

test("MSE-25.82 preserves destination exposure parity with sitemap", () => {
  const exposure = read("backend/src/modules/public-site-read/destination-exposure.js");
  const sitemap = read("backend/src/modules/minisite-structured-data/sitemap.js");

  for (const type of [
    "destination-grid",
    "destinations",
    "destinations-highlight",
    "destination-recommendations",
  ]) {
    assert.ok(exposure.includes(`\"${type}\"`), `exposure must support ${type}`);
    assert.ok(sitemap.includes(`\"${type}\"`), `sitemap must support ${type}`);
  }

  assert.match(exposure, /DESTINATION_BLOCK_TYPES/);
  assert.match(sitemap, /DESTINATION_BLOCK_TYPES/);
});

test("MSE-25.82 keeps Search Console operations read-only by default", () => {
  const routes = read("backend/src/modules/search-console-submission/routes.js");

  assert.match(routes, /explicitApprovalRequired:true/);
  assert.match(routes, /autoSubmit:false/);
  assert.match(routes, /readOnlyRuntimeReadiness:true/);
  assert.match(routes, /readOnlyPublicHttpIndexability:true/);
});
