"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertRolloutReportIntegrity,
  auditRolloutReportIntegrity,
} = require("../src/modules/minisite-seo-enrichment/rollout-report-integrity");

function validReport() {
  const parameters = {
    similarityThreshold: 0.82,
    minimumWords: 40,
    qualityMinimumWords: 60,
  };
  const fingerprint = "a".repeat(64);
  return {
    type: "mse-25.30-network-rollout-report",
    repository: { head: "abc123" },
    preflight: {
      repositoryHead: "abc123",
      planFingerprint: fingerprint,
      parameters,
    },
    result: {
      ok: true,
      writes: true,
      approvedPlanFingerprint: fingerprint,
      parameters: { ...parameters },
      preflight: {
        repositoryHead: "abc123",
        planFingerprint: fingerprint,
        parameters: { ...parameters },
      },
    },
  };
}

test("MSE-25.30 accepte un rapport dont HEAD fingerprint et paramètres sont cohérents", () => {
  const audit = assertRolloutReportIntegrity(validReport());
  assert.equal(audit.ok, true);
  assert.equal(audit.repositoryHead, "abc123");
  assert.equal(audit.planFingerprint, "a".repeat(64));
  assert.deepEqual(audit.issues, []);
});

test("MSE-25.30 refuse un HEAD de repository désynchronisé du preflight", () => {
  const report = validReport();
  report.repository.head = "tampered-head";
  const audit = auditRolloutReportIntegrity(report);

  assert.equal(audit.ok, false);
  assert.ok(audit.issues.some((issue) => issue.code === "repository-head-mismatch"));
});

test("MSE-25.30 refuse un fingerprint approuvé différent du preflight", () => {
  const report = validReport();
  report.result.approvedPlanFingerprint = "b".repeat(64);

  assert.throws(() => assertRolloutReportIntegrity(report), (error) => {
    assert.equal(error.code, "MSE_25_30_ROLLOUT_REPORT_INTEGRITY_MISMATCH");
    assert.ok(error.details.issues.some((issue) => issue.code === "plan-fingerprint-mismatch"));
    return true;
  });
});

test("MSE-25.30 refuse des paramètres appliqués différents du plan approuvé", () => {
  const report = validReport();
  report.result.parameters.minimumWords = 999;
  const audit = auditRolloutReportIntegrity(report);

  assert.equal(audit.ok, false);
  assert.ok(audit.issues.some((issue) => issue.code === "rollout-parameters-mismatch"));
});

test("MSE-25.30 refuse un rapport qui ne décrit pas un apply réussi", () => {
  const report = validReport();
  report.result.writes = false;
  const audit = auditRolloutReportIntegrity(report);

  assert.equal(audit.ok, false);
  assert.ok(audit.issues.some((issue) => issue.code === "rollout-not-successfully-applied"));
});
