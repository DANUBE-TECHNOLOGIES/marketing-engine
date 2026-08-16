"use strict";

const fs = require("node:fs");
const path = require("node:path");
const legacyApply = require("../../../scripts/mse-25-30-network-apply");
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

function persistApprovedScope({ rolloutReportPath, preflightReportPath } = {}) {
  if (!rolloutReportPath || !preflightReportPath) {
    const error = new Error("Les rapports rollout et preflight sont obligatoires pour enregistrer le périmètre approuvé.");
    error.code = "MSE_25_30_ROLLOUT_APPROVED_SCOPE_REPORT_REQUIRED";
    throw error;
  }

  const rolloutPath = path.resolve(String(rolloutReportPath));
  const preflightPath = path.resolve(String(preflightReportPath));
  const rollout = readJson(rolloutPath);
  const preflight = readJson(preflightPath);
  const approvedScope = approvedScopeFromPreflight(preflight);
  const approvedScopeAudit = assertExcludedScopeRespected(rollout, approvedScope);
  const enriched = {
    ...rollout,
    approvedScope,
    approvedScopeAudit,
    result: {
      ...(rollout.result || {}),
      approvedScope,
      approvedScopeAudit,
    },
  };
  fs.writeFileSync(rolloutPath, JSON.stringify(enriched, null, 2) + "\n", "utf8");
  return { rolloutReportPath: rolloutPath, approvedScope, approvedScopeAudit };
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
  const result = await legacyApply.run(options);
  if (result?.rolloutReportPersisted !== true || !result?.rolloutReportPath) return result;

  try {
    const scopeAudit = persistApprovedScope({
      rolloutReportPath: result.rolloutReportPath,
      preflightReportPath: result?.preflight?.reportPath,
    });
    const integrityAudit = persistRolloutReportIntegrity(result.rolloutReportPath);
    const enriched = {
      ...result,
      approvedScope: scopeAudit.approvedScope,
      approvedScopeAudit: scopeAudit.approvedScopeAudit,
      rolloutReportIntegrity: integrityAudit.rolloutReportIntegrity,
    };
    console.log(JSON.stringify({
      ok: true,
      audit: "mse-25.30-rollout-report-certified",
      rolloutReportPath: scopeAudit.rolloutReportPath,
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
  excludedScopeAudit,
  normalizeSiteSlug,
  persistApprovedScope,
  persistRolloutReportIntegrity,
  rolloutRollbackManifest,
  run,
};
