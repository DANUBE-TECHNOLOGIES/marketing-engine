"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildRemediationPlan, remediationKind } = require("./remediation-planner");

const googleEnv = { GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret" };

test("remediation kind follows provider submission mode and readiness", () => {
  assert.equal(remediationKind({ providerKey: "google_business_profile", submissionMode: "api" }, googleEnv), "managed_api");
  assert.equal(remediationKind({ providerKey: "apple_business_connect", submissionMode: "api" }, {}), "provider_blocked");
  assert.equal(remediationKind({ providerKey: "pagesjaunes", submissionMode: "manual" }, {}), "manual");
});

test("remediation plan preserves priority order and requires confirmation", () => {
  const queue = [
    { agencyId: 1, providerKey: "pagesjaunes", directoryName: "PagesJaunes", score: 150, submissionMode: "manual", drift: ["phone"] },
    { agencyId: 2, providerKey: "google_business_profile", directoryName: "Google Business Profile", score: 120, submissionMode: "api", drift: ["website"] }
  ];
  const plan = buildRemediationPlan(queue, { limit: 2, env: googleEnv });
  assert.equal(plan.totalAnomalies, 2);
  assert.equal(plan.planned, 2);
  assert.equal(plan.items[0].providerKey, "pagesjaunes");
  assert.equal(plan.items[0].requiresConfirmation, true);
  assert.equal(plan.items[1].remediationKind, "managed_api");
  assert.equal(plan.items[1].executable, true);
  assert.equal(plan.executable, 1);
});

test("unready API providers are explicitly blocked instead of pretending to be executable", () => {
  const plan = buildRemediationPlan([
    { agencyId: 3, providerKey: "apple_business_connect", directoryName: "Apple Business Connect", score: 100, submissionMode: "api", drift: ["phone"] }
  ], { env: {} });
  assert.equal(plan.blocked, 1);
  assert.equal(plan.items[0].executable, false);
  assert.equal(plan.items[0].providerReadiness.stage, "onboarding_required");
});
