"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { appleReadiness, getProviderReadiness } = require("./provider-readiness");

test("Apple remains blocked until approval, qualification and credentials are complete", () => {
  const readiness = appleReadiness({
    APPLE_BUSINESS_CLIENT_ID: "client",
    APPLE_BUSINESS_CLIENT_SECRET: "secret"
  });

  assert.equal(readiness.ready, false);
  assert.equal(readiness.stage, "onboarding_required");
  assert.ok(readiness.checks.some((item) => item.key === "api_access_approved" && item.ok === false));
  assert.ok(readiness.checks.some((item) => item.key === "client_id" && item.ok === true));
});

test("Apple becomes production ready only when all official onboarding gates are explicit", () => {
  const readiness = appleReadiness({
    APPLE_BUSINESS_API_APPROVED: "true",
    APPLE_BUSINESS_INTEGRATION_VERIFIED: "true",
    APPLE_BUSINESS_DATA_QUALIFIED: "true",
    APPLE_BUSINESS_PRODUCTION_ENABLED: "true",
    APPLE_BUSINESS_CLIENT_ID: "client",
    APPLE_BUSINESS_CLIENT_SECRET: "secret"
  });

  assert.equal(readiness.ready, true);
  assert.equal(readiness.stage, "production_ready");
  assert.equal(readiness.checks.every((item) => item.ok), true);
});

test("closed providers remain monitor-only instead of pretending to be writable", () => {
  const readiness = getProviderReadiness("pagesjaunes", {});
  assert.equal(readiness.ready, false);
  assert.equal(readiness.stage, "monitor_only");
});

test("unknown provider has no readiness contract", () => {
  assert.equal(getProviderReadiness("does_not_exist", {}), null);
});
