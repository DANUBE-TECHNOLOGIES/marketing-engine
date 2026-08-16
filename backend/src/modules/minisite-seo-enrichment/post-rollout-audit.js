"use strict";

const fs = require("node:fs");
const path = require("node:path");
const validator = require("./post-rollout-validator");
const {
  assertExcludedScopeRespected,
  normalizeSiteSlug,
} = require("./network-apply-audit");

function readRolloutReport(filePath) {
  const configuredPath = String(filePath || process.env.MSE_25_30_ROLLOUT_REPORT || "").trim();
  if (!configuredPath) {
    const error = new Error("MSE_25_30_ROLLOUT_REPORT est obligatoire pour vérifier la preuve de périmètre.");
    error.code = "MSE_25_30_POST_ROLLOUT_REPORT_REQUIRED";
    throw error;
  }

  const resolvedPath = path.resolve(configuredPath);
  let report;
  try {
    report = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (cause) {
    const error = new Error(`Impossible de lire le rapport de rollout : ${resolvedPath}`);
    error.code = "MSE_25_30_POST_ROLLOUT_REPORT_INVALID";
    error.details = { reportPath: resolvedPath, cause: cause?.message || String(cause) };
    throw error;
  }
  return { report, reportPath: resolvedPath };
}

function normalizedSlugs(values = []) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(normalizeSiteSlug)
    .filter(Boolean))].sort();
}

function assertApprovedScopeAudit(report = {}) {
  const approvedScope = report?.approvedScope || report?.result?.approvedScope;
  const approvedScopeAudit = report?.approvedScopeAudit || report?.result?.approvedScopeAudit;

  if (!approvedScope || !approvedScopeAudit || approvedScopeAudit.ok !== true) {
    const error = new Error("Le rapport de rollout ne contient pas une preuve de périmètre d'exclusion auditée avec succès.");
    error.code = "MSE_25_30_POST_ROLLOUT_APPROVED_SCOPE_AUDIT_REQUIRED";
    error.details = {
      approvedScopePresent: Boolean(approvedScope),
      approvedScopeAuditPresent: Boolean(approvedScopeAudit),
      approvedScopeAuditOk: approvedScopeAudit?.ok ?? null,
    };
    throw error;
  }

  const approvedSlugs = normalizedSlugs(approvedScope.excludedSiteSlugs);
  const auditedSlugs = normalizedSlugs(approvedScopeAudit.excludedSiteSlugs);
  if (JSON.stringify(approvedSlugs) !== JSON.stringify(auditedSlugs)) {
    const error = new Error("La preuve de périmètre ne correspond pas au périmètre d'exclusion approuvé.");
    error.code = "MSE_25_30_POST_ROLLOUT_APPROVED_SCOPE_AUDIT_MISMATCH";
    error.details = { approvedSlugs, auditedSlugs };
    throw error;
  }

  const recomputed = assertExcludedScopeRespected(report, { excludedSiteSlugs: approvedSlugs });
  return {
    ok: true,
    excludedSiteSlugs: approvedSlugs,
    appliedAgencyCount: recomputed.appliedAgencyCount,
    rollbackManifestCount: recomputed.rollbackManifestCount,
    violations: [],
  };
}

async function run(options = {}) {
  const loaded = readRolloutReport(options.rolloutReport);
  const approvedScopeAudit = assertApprovedScopeAudit(loaded.report);
  const result = await validator.run({
    ...options,
    rolloutReport: loaded.reportPath,
  });
  return {
    ...result,
    approvedScopeAudit,
  };
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      readOnly: true,
      error: error.code || "MSE_25_30_POST_ROLLOUT_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  assertApprovedScopeAudit,
  normalizedSlugs,
  readRolloutReport,
  run,
};
