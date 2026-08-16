"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  checkRolloutReport,
} = require("../src/modules/minisite-seo-enrichment/rollout-report-check");
const {
  EXPECTED_BRANCH,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
} = require("../scripts/mse-25-30-preflight");

const VALIDATED_BASE_SHA = "c72202f3eca15998d26254e502cf6a47a973c67f";

function baselineAttestation() {
  return {
    ok: true,
    repository: "DANUBE-TECHNOLOGIES/marketing-engine",
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: GITHUB_WORKFLOW_NAME,
    runId: 31955176772,
    headSha: VALIDATED_BASE_SHA,
    headBranch: EXPECTED_BRANCH,
    event: "push",
    status: "completed",
    conclusion: "success",
    htmlUrl: "https://github.com/DANUBE-TECHNOLOGIES/marketing-engine/actions/runs/31955176772",
  };
}

function validReport() {
  const fingerprint = "a".repeat(64);
  const parameters = {
    similarityThreshold: 0.82,
    minimumWords: 40,
    qualityMinimumWords: 60,
  };
  const attestation = baselineAttestation();
  return {
    type: "mse-25.30-network-rollout-report",
    repository: {
      head: "abc123",
      validatedBaseSha: VALIDATED_BASE_SHA,
      validatedBaselineAttestation: { ...attestation },
    },
    preflight: {
      repositoryHead: "abc123",
      validatedBaseSha: VALIDATED_BASE_SHA,
      baselineAttestation: { ...attestation },
      planFingerprint: fingerprint,
      parameters,
    },
    approvedScope: {
      excludedSiteSlugs: ["tui-store-melun"],
      excludedAgencies: [{ agencyId: 8, siteSlug: "tui-store-melun", city: "Melun" }],
    },
    approvedScopeAudit: {
      ok: true,
      excludedSiteSlugs: ["tui-store-melun"],
      appliedAgencyCount: 1,
      rollbackManifestCount: 1,
      violations: [],
    },
    result: {
      ok: true,
      writes: true,
      approvedPlanFingerprint: fingerprint,
      parameters: { ...parameters },
      preflight: {
        repositoryHead: "abc123",
        validatedBaseSha: VALIDATED_BASE_SHA,
        baselineAttestation: { ...attestation },
        planFingerprint: fingerprint,
        parameters: { ...parameters },
      },
      agencies: [{
        agencyId: 9,
        siteSlug: "tui-store-amilly",
        pages: [{ slug: "home", changed: true, rollbackVersionId: 101 }],
      }],
    },
    rollbackManifest: [
      { agencyId: 9, siteSlug: "tui-store-amilly", slug: "home", rollbackVersionId: 101 },
    ],
  };
}

test("MSE-25.30 contrôle hors ligne les quatre chaînes de preuve", () => {
  const result = checkRolloutReport(validReport());

  assert.equal(result.ok, true);
  assert.equal(result.readOnly, true);
  assert.equal(result.offline, true);
  assert.equal(result.rolloutReportIntegrity.ok, true);
  assert.equal(result.baselineAttestationAudit.ok, true);
  assert.equal(result.baselineAttestationAudit.validatedBaseSha, VALIDATED_BASE_SHA);
  assert.equal(result.approvedScopeAudit.ok, true);
  assert.equal(result.rollbackManifestAudit.ok, true);
});

test("MSE-25.30 contrôle hors ligne refuse un manifeste de rollback altéré", () => {
  const report = validReport();
  report.rollbackManifest.push({
    agencyId: 8,
    siteSlug: "tui-store-melun",
    slug: "home",
    rollbackVersionId: 999,
  });

  assert.throws(() => checkRolloutReport(report), (error) => {
    assert.equal(error.code, "MSE_25_30_ROLLOUT_EXCLUDED_SCOPE_VIOLATION");
    return true;
  });
});

test("MSE-25.30 contrôle hors ligne refuse une preuve interne désynchronisée", () => {
  const report = validReport();
  report.result.approvedPlanFingerprint = "b".repeat(64);

  assert.throws(() => checkRolloutReport(report), (error) => {
    assert.equal(error.code, "MSE_25_30_ROLLOUT_REPORT_INTEGRITY_MISMATCH");
    return true;
  });
});

test("MSE-25.30 contrôle hors ligne refuse une attestation CI falsifiée", () => {
  const report = validReport();
  report.result.preflight.baselineAttestation.conclusion = "failure";

  assert.throws(() => checkRolloutReport(report), (error) => {
    assert.equal(error.code, "MSE_25_30_ROLLOUT_BASELINE_CI_ATTESTATION_MISMATCH");
    assert.equal(error.details.ok, false);
    return true;
  });
});
