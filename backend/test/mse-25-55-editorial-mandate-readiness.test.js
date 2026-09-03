"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateEditorialMandateReadiness } = require("../src/modules/minisite-semantic-engine/editorial-mandate-readiness");

function decisionReport(decision = "REFINE_EXISTING_PAGE", overrides = {}) {
  return {
    type: "MSE_25_54_HUMAN_SEO_REVIEW_DECISION_REPORT",
    certified: true, readOnly: true, writes: false, publicWrites: false,
    summary: { executableCount: 0, automaticWriteCount: 0 },
    decision: {
      humanDecision: true,
      decision,
      nextStep: decision === "REFINE_EXISTING_PAGE" ? "PREPARE_NON_EXECUTABLE_EDITORIAL_MANDATE" : "NO_CHANGE_REQUESTED",
      reviewOnly: true, executable: false, automaticWrite: false,
      decisionFingerprint: "decision-fp",
    },
    ...overrides,
  };
}

test("no MSE-25.54 decision keeps MSE-25.55 waiting without synthetic approval", () => {
  const readiness = evaluateEditorialMandateReadiness();
  assert.equal(readiness.ready, false);
  assert.equal(readiness.state, "WAITING_FOR_HUMAN_REFINE_DECISION");
  assert.equal(readiness.policy.noSyntheticHumanDecision, true);
  assert.equal(readiness.policy.automaticMandateCreation, false);
  assert.equal(readiness.executableCount, 0);
  assert.equal(readiness.automaticWriteCount, 0);
});

test("certified human REFINE_EXISTING_PAGE makes only the mandate preview ready", () => {
  const readiness = evaluateEditorialMandateReadiness({ decisionReport: decisionReport(), decisionReportPath: "/tmp/decision.json" });
  assert.equal(readiness.ready, true);
  assert.equal(readiness.state, "HUMAN_REFINE_DECISION_AVAILABLE");
  assert.equal(readiness.readOnly, true);
  assert.equal(readiness.writes, false);
  assert.equal(readiness.publicWrites, false);
  assert.equal(readiness.executableCount, 0);
});

test("KEEP_AS_IS remains non eligible for editorial mandate", () => {
  const readiness = evaluateEditorialMandateReadiness({ decisionReport: decisionReport("KEEP_AS_IS") });
  assert.equal(readiness.ready, false);
  assert.match(readiness.reason, /DECISION_NOT_ELIGIBLE/);
});

test("unsafe human decision source fails closed", () => {
  assert.throws(() => evaluateEditorialMandateReadiness({ decisionReport: decisionReport("REFINE_EXISTING_PAGE", { writes: true }) }), /UNSAFE_HUMAN_DECISION_REPORT/);
});
