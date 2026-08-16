"use strict";

const fs = require("node:fs");
const path = require("node:path");
const legacyApply = require("../../../scripts/mse-25-30-network-apply");

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

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function persistApprovedScope({ rolloutReportPath, preflightReportPath } = {}) {
  const rolloutPath = path.resolve(String(rolloutReportPath || ""));
  const preflightPath = path.resolve(String(preflightReportPath || ""));
  if (!rolloutReportPath || !preflightReportPath) {
    const error = new Error("Les rapports rollout et preflight sont obligatoires pour enregistrer le périmètre approuvé.");
    error.code = "MSE_25_30_ROLLOUT_APPROVED_SCOPE_REPORT_REQUIRED";
    throw error;
  }

  const rollout = readJson(rolloutPath);
  const preflight = readJson(preflightPath);
  const approvedScope = approvedScopeFromPreflight(preflight);
  const enriched = {
    ...rollout,
    approvedScope,
    result: {
      ...(rollout.result || {}),
      approvedScope,
    },
  };
  fs.writeFileSync(rolloutPath, JSON.stringify(enriched, null, 2) + "\n", "utf8");
  return { rolloutReportPath: rolloutPath, approvedScope };
}

async function run(options = {}) {
  const result = await legacyApply.run(options);
  if (result?.rolloutReportPersisted !== true || !result?.rolloutReportPath) return result;

  try {
    const audit = persistApprovedScope({
      rolloutReportPath: result.rolloutReportPath,
      preflightReportPath: result?.preflight?.reportPath,
    });
    const enriched = { ...result, approvedScope: audit.approvedScope };
    console.log(JSON.stringify({
      ok: true,
      audit: "mse-25.30-approved-scope-persisted",
      rolloutReportPath: audit.rolloutReportPath,
      approvedScope: audit.approvedScope,
    }, null, 2));
    return enriched;
  } catch (cause) {
    const error = {
      code: "MSE_25_30_ROLLOUT_APPROVED_SCOPE_PERSIST_FAILED",
      message: cause?.message || String(cause),
    };
    console.error(JSON.stringify({
      ok: false,
      writes: result?.writes === true,
      operatorAttentionRequired: true,
      error: error.code,
      message: error.message,
      rolloutReportPath: result?.rolloutReportPath || null,
    }, null, 2));
    process.exitCode = 2;
    return { ...result, operatorAttentionRequired: true, approvedScopeAuditError: error };
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
  normalizeSiteSlug,
  persistApprovedScope,
  run,
};
