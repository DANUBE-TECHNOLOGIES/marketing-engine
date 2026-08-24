"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildRemediationPlan, remediationKind } = require("./remediation-planner");

test("remediation kind follows provider submission mode", () => {
  assert.equal(remediationKind({ submissionMode: "api" }), "managed_api");
  assert.equal(remediationKind({ submissionMode: "submission_api" }), "submission_api");
  assert.equal(remediationKind({ submissionMode: "manual" }), "manual");
});

test("remediation plan preserves priority order and requires confirmation", () => {
  const queue = [
    { agencyId: 1, providerKey: "pagesjaunes", directoryName: "PagesJaunes", score: 150, submissionMode: "manual", drift: ["phone"] },
    { agencyId: 2, providerKey: "google_business_profile", directoryName: "Google Business Profile", score: 120, submissionMode: "api", drift: ["website"] }
  ];
  const plan = buildRemediationPlan(queue, { limit: 1 });
  assert.equal(plan.totalAnomalies, 2);
  assert.equal(plan.planned, 1);
  assert.equal(plan.items[0].providerKey, "pagesjaunes");
  assert.equal(plan.items[0].requiresConfirmation, true);
});
