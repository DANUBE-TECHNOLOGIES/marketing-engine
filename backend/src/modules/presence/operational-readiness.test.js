"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildOperationalReadiness } = require("./operational-readiness");

function prismaMock({ schemaReady = true, refreshToken = "refresh" } = {}) {
  return {
    $queryRawUnsafe: async () => schemaReady ? [] : [{ missing: "DirectoryListing.automationStatus" }],
    googleToken: { findFirst: async () => refreshToken ? { refreshToken, createdAt: new Date() } : null }
  };
}

test("Google managed writes are blocked without OAuth environment", async () => {
  const readiness = await buildOperationalReadiness(prismaMock(), {});
  assert.equal(readiness.readyForGoogleManagedWrites, false);
  assert.ok(readiness.blockers.includes("google_oauth_config"));
});

test("discovery readiness requires both DataForSEO credentials", async () => {
  const env = {
    GOOGLE_CLIENT_ID: "id",
    GOOGLE_CLIENT_SECRET: "secret",
    DATAFORSEO_LOGIN: "login",
    DATAFORSEO_PASSWORD: "password"
  };
  const readiness = await buildOperationalReadiness(prismaMock(), env);
  assert.equal(readiness.readyForDiscovery, true);
});
