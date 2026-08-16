"use strict";

const fs = require("node:fs");
const path = require("node:path");
const legacyApply = require("../../../scripts/mse-25-30-network-apply");
const {
  EXPECTED_BRANCH,
  EXPECTED_GITHUB_WORKFLOW_BLOB_SHA,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
  attestValidatedBaseline,
  repositoryState,
} = require("../../../scripts/mse-25-30-preflight");
const { assertRolloutReportIntegrity } = require("./rollout-report-integrity");

function normalizeSiteSlug(value) {
  return String(value || "").trim().toLocaleLowerCase("fr-FR");
}

function approvedScopeFromPreflight(report = {}) {
  const preview = report?.preview && typeof report.preview === "object" ? report.preview : {};
  const slugs = [...new Set((Array.isArray(preview.excludedSiteSlugs) ? preview.excludedSiteSlugs : [])
    .map(normalizeSiteSlug)
    .filter(Boolean))];
  const allowed = new Set(slugs);
  const agencies = (Array.isArray(preview.excludedAgencies) ? preview.excludedAgencies : [])
    .map((agency) => ({
      agencyId: agency?.agencyId ?? null,
      siteSlug: normalizeSiteSlug(agency?.siteSlug),
      city: agency?.city || null,
    }))
    .filter((agency) => agency.siteSlug)
    .filter((agency) => !allowed.size || allowed.has(agency.siteSlug));

  return {
    excludedSiteSlugs: slugs,
    excludedAgencies: agencies,
  };
}

function rolloutRollbackManifest(rollout = {}) {
  if (Array.isArray(rollout?.rollbackManifest)) return rollout.rollbackManifest;
  if (Array.isArray(rollout?.result?.rollbackManifest)) return rollout.result.rollbackManifest;
  return [];
}

function excludedScopeAudit(rollout = {}, approvedScope = {}) {
  const excluded = new Set((approvedScope?.excludedSiteSlugs || []).map(normalizeSiteSlug).filter(Boolean));
  const appliedAgencies = Array.isArray(rollout?.result?.agencies) ? rollout.result.agencies : [];
  const rollbackManifest = rolloutRollbackManifest(rollout);
  const violations = [];

  for (const agency of appliedAgencies) {
    const siteSlug = normalizeSiteSlug(agency?.siteSlug);
    if (siteSlug && excluded.has(siteSlug)) {
      violations.push({
        source: "result.agencies",
        agencyId: agency?.agencyId ?? null,
        siteSlug,
      });
    }
  }

  for (const entry of rollbackManifest) {
    const siteSlug = normalizeSiteSlug(entry?.siteSlug);
    if (siteSlug && excluded.has(siteSlug)) {
      violations.push({
        source: "rollbackManifest",
        agencyId: entry?.agencyId ?? null,
        siteSlug,
        slug: entry?.slug ?? null,
      });
    }
  }

  return {
    ok: violations.length === 0,
    excludedSiteSlugs: [...excluded],
    appliedAgencyCount: appliedAgencies.length,
    rollbackManifestCount: rollbackManifest.length,
    violations,
  };
}

function assertExcludedScopeRespected(rollout = {}, approvedScope = {}) {
  const audit = excludedScopeAudit(rollout, approvedScope);
  if (!audit.ok) {
    const error = new Error("Le rollout contient une agence explicitement exclue par le preflight.");
    error.code = "MSE_25_30_ROLLOUT_EXCLUDED_SCOPE_VIOLATION";
    error.details = audit;
    throw error;
  }
  return audit;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function preflightReportPath(value) {
  const configured = String(value || process.env.MSE_25_30_PREFLIGHT_REPORT || "").trim();
  if (!configured) {
    const error = new Error("MSE_25_30_PREFLIGHT_REPORT est obligatoire pour vérifier l'attestation CI avant l'apply.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_REPORT_REQUIRED";
    throw error;
  }
  return path.resolve(configured);
}

function assertPreflightBaselineAttestation(preflight = {}, repository = {}, liveAttestation = {}) {
  const baselineSha = String(repository?.validatedBaseSha || "").trim().toLowerCase();
  const reportBaselineSha = String(preflight?.repository?.validatedBaseSha || "").trim().toLowerCase();
  const recorded = preflight?.repository?.validatedBaselineAttestation;
  const issues = [];

  if (!baselineSha || reportBaselineSha !== baselineSha) {
    issues.push({
      code: "validated-base-sha-mismatch",
      current: baselineSha || null,
      preflight: reportBaselineSha || null,
    });
  }

  for (const [source, attestation] of [["preflight", recorded], ["live", liveAttestation]]) {
    if (!attestation || attestation.ok !== true) {
      issues.push({ code: `${source}-attestation-missing` });
      continue;
    }
    if (String(attestation.headSha || "").trim().toLowerCase() !== baselineSha) {
      issues.push({ code: `${source}-attestation-sha-mismatch`, actual: attestation.headSha || null, expected: baselineSha || null });
    }
    if (attestation.workflowId !== GITHUB_WORKFLOW_ID || attestation.workflowName !== GITHUB_WORKFLOW_NAME) {
      issues.push({
        code: `${source}-attestation-workflow-mismatch`,
        workflowId: attestation.workflowId ?? null,
        workflowName: attestation.workflowName ?? null,
      });
    }
    if (attestation.workflowPath !== GITHUB_WORKFLOW_PATH || String(attestation.workflowBlobSha || "").trim().toLowerCase() !== EXPECTED_GITHUB_WORKFLOW_BLOB_SHA) {
      issues.push({
        code: `${source}-attestation-workflow-definition-mismatch`,
        expectedPath: GITHUB_WORKFLOW_PATH,
        actualPath: attestation.workflowPath ?? null,
        expectedBlobSha: EXPECTED_GITHUB_WORKFLOW_BLOB_SHA,
        actualBlobSha: attestation.workflowBlobSha ?? null,
      });
    }
    if (attestation.headBranch !== EXPECTED_BRANCH || attestation.event !== "push" || attestation.status !== "completed" || attestation.conclusion !== "success") {
      issues.push({
        code: `${source}-attestation-result-mismatch`,
        headBranch: attestation.headBranch ?? null,
        event: attestation.event ?? null,
        status: attestation.status ?? null,
        conclusion: attestation.conclusion ?? null,
      });
    }
  }

  if (recorded?.runId !== liveAttestation?.runId) {
    issues.push({
      code: "attestation-run-mismatch",
      preflightRunId: recorded?.runId ?? null,
      liveRunId: liveAttestation?.runId ?? null,
    });
  }

  if (issues.length > 0) {
    const error = new Error("L'attestation CI de la baseline du preflight ne correspond pas à la baseline Git courante ni à la définition CI certifiée par GitHub Actions.");
    error.code = "MSE_25_30_NETWORK_ROLLOUT_BASELINE_CI_ATTESTATION_MISMATCH";
    error.details = { baselineSha: baselineSha || null, issues };
    throw error;
  }

  return {
    ok: true,
    validatedBaseSha: baselineSha,
    preflightRunId: recorded.runId,
    liveRunId: liveAttestation.runId,
    workflowId: liveAttestation.workflowId,
    workflowName: liveAttestation.workflowName,
    workflowPath: liveAttestation.workflowPath,
    workflowBlobSha: liveAttestation.workflowBlobSha,
    headSha: liveAttestation.headSha,
    headBranch: liveAttestation.headBranch,
    event: liveAttestation.event,
    status: liveAttestation.status,
    conclusion: liveAttestation.conclusion,
    htmlUrl: liveAttestation.htmlUrl || null,
  };
}

function persistApprovedScope({ rolloutReportPath, preflightReportPath: sourcePreflightReportPath, baselineAttestation } = {}) {
  if (!rolloutReportPath || !sourcePreflightReportPath) {
    const error = new Error("Les rapports rollout et preflight sont obligatoires pour enregistrer le périmètre approuvé.");
    error.code = "MSE_25_30_ROLLOUT_APPROVED_SCOPE_REPORT_REQUIRED";
    throw error;
  }

  const rolloutPath = path.resolve(String(rolloutReportPath));
  const preflightPath = path.resolve(String(sourcePreflightReportPath));
  const rollout = readJson(rolloutPath);
  const preflight = readJson(preflightPath);
  const approvedScope = approvedScopeFromPreflight(preflight);
  const approvedScopeAudit = assertExcludedScopeRespected(rollout, approvedScope);
  const validatedBaseSha = String(rollout?.repository?.validatedBaseSha || preflight?.repository?.validatedBaseSha || "").trim().toLowerCase();
  const attestation = baselineAttestation || preflight?.repository?.validatedBaselineAttestation || null;
  const enrichedPreflight = {
    ...(rollout.preflight || {}),
    validatedBaseSha,
    baselineAttestation: attestation,
  };
  const enriched = {
    ...rollout,
    repository: {
      ...(rollout.repository || {}),
      validatedBaselineAttestation: attestation,
    },
    preflight: enrichedPreflight,
    approvedScope,
    approvedScopeAudit,
    result: {
      ...(rollout.result || {}),
      preflight: {
        ...(rollout?.result?.preflight || {}),
        validatedBaseSha,
        baselineAttestation: attestation,
      },
      approvedScope,
      approvedScopeAudit,
    },
  };
  fs.writeFileSync(rolloutPath, JSON.stringify(enriched, null, 2) + "\n", "utf8");
  return { rolloutReportPath: rolloutPath, approvedScope, approvedScopeAudit, validatedBaseSha, baselineAttestation: attestation };
}

function persistRolloutReportIntegrity(rolloutReportPath) {
  if (!rolloutReportPath) {
    const error = new Error("Le rapport de rollout est obligatoire pour certifier son intégrité.");
    error.code = "MSE_25_30_ROLLOUT_REPORT_REQUIRED";
    throw error;
  }
  const rolloutPath = path.resolve(String(rolloutReportPath));
  const rollout = readJson(rolloutPath);
  const rolloutReportIntegrity = assertRolloutReportIntegrity(rollout);
  const enriched = {
    ...rollout,
    rolloutReportIntegrity,
    result: {
      ...(rollout.result || {}),
      rolloutReportIntegrity,
    },
  };
  fs.writeFileSync(rolloutPath, JSON.stringify(enriched, null, 2) + "\n", "utf8");
  return { rolloutReportPath: rolloutPath, rolloutReportIntegrity };
}

async function run(options = {}) {
  const repoBeforeApply = repositoryState();
  const liveBaselineAttestation = await attestValidatedBaseline(repoBeforeApply.validatedBaseSha, {
    expectedBranch: process.env.MSE_25_30_EXPECTED_BRANCH || EXPECTED_BRANCH,
  });
  const sourcePreflightPath = preflightReportPath(options.preflightReport);
  const sourcePreflight = readJson(sourcePreflightPath);
  const baselineAttestationAudit = assertPreflightBaselineAttestation(sourcePreflight, repoBeforeApply, liveBaselineAttestation);

  const result = await legacyApply.run(options);
  if (result?.rolloutReportPersisted !== true || !result?.rolloutReportPath) return {
    ...result,
    baselineAttestationAudit,
  };

  try {
    const scopeAudit = persistApprovedScope({
      rolloutReportPath: result.rolloutReportPath,
      preflightReportPath: result?.preflight?.reportPath,
      baselineAttestation: liveBaselineAttestation,
    });
    const integrityAudit = persistRolloutReportIntegrity(result.rolloutReportPath);
    const enriched = {
      ...result,
      validatedBaseSha: scopeAudit.validatedBaseSha,
      baselineAttestation: scopeAudit.baselineAttestation,
      baselineAttestationAudit,
      approvedScope: scopeAudit.approvedScope,
      approvedScopeAudit: scopeAudit.approvedScopeAudit,
      rolloutReportIntegrity: integrityAudit.rolloutReportIntegrity,
    };
    console.log(JSON.stringify({
      ok: true,
      audit: "mse-25.30-rollout-report-certified",
      rolloutReportPath: scopeAudit.rolloutReportPath,
      validatedBaseSha: scopeAudit.validatedBaseSha,
      baselineAttestation: scopeAudit.baselineAttestation,
      baselineAttestationAudit,
      approvedScope: scopeAudit.approvedScope,
      approvedScopeAudit: scopeAudit.approvedScopeAudit,
      rolloutReportIntegrity: integrityAudit.rolloutReportIntegrity,
    }, null, 2));
    return enriched;
  } catch (cause) {
    const error = {
      code: cause?.code || "MSE_25_30_ROLLOUT_REPORT_CERTIFICATION_FAILED",
      message: cause?.message || String(cause),
      details: cause?.details || {},
    };
    console.error(JSON.stringify({
      ok: false,
      writes: result?.writes === true,
      operatorAttentionRequired: true,
      error: error.code,
      message: error.message,
      details: error.details,
      rolloutReportPath: result?.rolloutReportPath || null,
    }, null, 2));
    process.exitCode = 2;
    return { ...result, operatorAttentionRequired: true, rolloutReportCertificationError: error };
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_30_NETWORK_ROLLOUT_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  approvedScopeFromPreflight,
  assertExcludedScopeRespected,
  assertPreflightBaselineAttestation,
  excludedScopeAudit,
  normalizeSiteSlug,
  persistApprovedScope,
  persistRolloutReportIntegrity,
  preflightReportPath,
  rolloutRollbackManifest,
  run,
};
