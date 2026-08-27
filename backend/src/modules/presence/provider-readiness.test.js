"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { appleReadiness, getProviderReadiness, configuredApiReadiness } = require("./provider-readiness");

test("Apple remains blocked until approval, qualification and credentials are complete", () => {
  const readiness = appleReadiness({ APPLE_BUSINESS_CLIENT_ID: "client", APPLE_BUSINESS_CLIENT_SECRET: "secret" });
  assert.equal(readiness.ready, false);
  assert.equal(readiness.stage, "onboarding_required");
  assert.equal(readiness.operationalMode, "blocked");
  assert.ok(readiness.checks.some((item) => item.key === "api_access_approved" && item.ok === false));
});

test("Apple becomes production ready only when all official onboarding gates are explicit", () => {
  const readiness = appleReadiness({ APPLE_BUSINESS_API_APPROVED: "true", APPLE_BUSINESS_INTEGRATION_VERIFIED: "true", APPLE_BUSINESS_DATA_QUALIFIED: "true", APPLE_BUSINESS_PRODUCTION_ENABLED: "true", APPLE_BUSINESS_CLIENT_ID: "client", APPLE_BUSINESS_CLIENT_SECRET: "secret" });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.stage, "production_ready");
  assert.equal(readiness.operationalMode, "managed_api");
});

test("manual providers are operational without pretending to expose write APIs", () => {
  const readiness = getProviderReadiness("pagesjaunes", {});
  assert.equal(readiness.ready, true);
  assert.equal(readiness.stage, "manual_operational");
  assert.equal(readiness.operationalMode, "manual");
});

test("monitored providers are operational for observation only", () => {
  const readiness = getProviderReadiness("mappy", {});
  assert.equal(readiness.ready, true);
  assert.equal(readiness.operationalMode, "monitor");
});

test("contribution APIs remain blocked until explicitly enabled and credentialed", () => {
  const blocked = configuredApiReadiness("here", "HERE_PRESENCE", {});
  assert.equal(blocked.ready, false);
  const ready = configuredApiReadiness("here", "HERE_PRESENCE", { HERE_PRESENCE_ENABLED: "true", HERE_PRESENCE_API_KEY: "secret" });
  assert.equal(ready.ready, true);
  assert.equal(ready.operationalMode, "submission_api");
});

test("unknown provider has no readiness contract", () => {
  assert.equal(getProviderReadiness("does_not_exist", {}), null);
});
