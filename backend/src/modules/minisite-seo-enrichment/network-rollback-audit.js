"use strict";

const fs = require("node:fs");
const path = require("node:path");
const legacyRollback = require("../../../scripts/mse-25-30-network-rollback");
const { assertApprovedScopeAudit } = require("./post-rollout-audit");
const { normalizeSiteSlug } = require("./network-apply-audit");
const { assertRolloutReportIntegrity } = require("./rollout-report-integrity");
const { assertBaselineAttestation } = require("./baseline-attestation-audit");

function normalizePageSlug(value) {
  const slug = String(value ?? "").trim().replace(/^\/+|\/+$/g, "").toLowerCase();
  return ["home", "accueil", "index"].includes(slug) ? "" : slug;
}

function readRolloutReport(filePath) {
  const configuredPath = String(filePath || process.env.MSE_25_30_ROLLBACK_MANIFEST || "").trim();
  if (!configuredPath) {
    const error = new Error("MSE_25_30_ROLLBACK_MANIFEST est obligatoire et doit pointer vers le rapport de rollout.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_REQUIRED";
    throw error;
  }
  const resolvedPath = path.resolve(configuredPath);
  let report;
  try {
    report = JSON.parse(fs.readFileSync(resolvedPath, "utf8"));
  } catch (cause) {
    const error = new Error(`Impossible de lire le rapport de rollout : ${resolvedPath}`);
    error.code = "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_INVALID";
    error.details = { reportPath: resolvedPath, cause: cause?.message || String(cause) };
    throw error;
  }
  return { report, reportPath: resolvedPath };
}

function assertContextualRolloutReport(report) {
  if (Array.isArray(report) || report?.type !== legacyRollback.ROLLOUT_REPORT_TYPE) {
    const error = new Error("Le rollback sécurisé MSE-25.30 exige le rapport de rollout contextuel complet ; les manifestes legacy ne sont plus acceptés par la commande npm.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_CONTEXT_REQUIRED";
    error.details = {
      reportType: Array.isArray(report) ? "legacy-array" : report?.type || null,
      legacyBypassSupported: false,
    };
    throw error;
  }
  return report;
}

function rollbackEntryKey(item = {}) {
  return [
    String(item?.agencyId ?? ""),
    normalizeSiteSlug(item?.siteSlug),
    normalizePageSlug(item?.slug),
    String(item?.rollbackVersionId ?? ""),
  ].join("|");
}

function expectedRollbackEntries(report = {}) {
  const agencies = Array.isArray(report?.result?.agencies) ? report.result.agencies : [];
  return agencies.flatMap((agency) =>
    (Array.isArray(agency?.pages) ? agency.pages : [])
      .filter((page) => page?.changed === true && page?.rollbackVersionId)
      .map((page) => ({
        agencyId: agency?.agencyId ?? null,
        siteSlug: normalizeSiteSlug(agency?.siteSlug),
        slug: normalizePageSlug(page?.slug),
        rollbackVersionId: page?.rollbackVersionId,
      }))
  );
}

function manifestFromReport(report = {}) {
  const manifest = report?.rollbackManifest || report?.result?.rollbackManifest;
  return legacyRollback.normalizeManifest(manifest).map((item) => ({
    ...item,
    siteSlug: normalizeSiteSlug(item.siteSlug),
    slug: normalizePageSlug(item.slug),
  }));
}

function auditRollbackManifest(report = {}) {
  const expected = expectedRollbackEntries(report);
  const actual = manifestFromReport(report);
  const expectedKeys = expected.map(rollbackEntryKey);
  const actualKeys = actual.map(rollbackEntryKey);
  const duplicateKeys = actualKeys.filter((key, index) => actualKeys.indexOf(key) !== index);
  const expectedSet = new Set(expectedKeys);
  const actualSet = new Set(actualKeys);
  const unexpected = actual.filter((item) => !expectedSet.has(rollbackEntryKey(item)));
  const missing = expected.filter((item) => !actualSet.has(rollbackEntryKey(item)));

  return {
    ok: duplicateKeys.length === 0
      && unexpected.length === 0
      && missing.length === 0
      && actual.length === expected.length,
    expectedCount: expected.length,
    manifestCount: actual.length,
    duplicateKeys: [...new Set(duplicateKeys)],
    unexpected,
    missing,
  };
}

function assertRollbackManifestIntegrity(report = {}) {
  const audit = auditRollbackManifest(report);
  if (!audit.ok) {
    const error = new Error("Le manifeste de rollback ne correspond pas exactement aux pages modifiées par le rollout.");
    error.code = "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_MISMATCH";
    error.details = audit;
    throw error;
  }
  return audit;
}

async function run(options = {}) {
  const configuredPath = options.manifestPath || process.env.MSE_25_30_ROLLBACK_MANIFEST;
  const loaded = readRolloutReport(configuredPath);
  assertContextualRolloutReport(loaded.report);

  const rolloutReportIntegrity = assertRolloutReportIntegrity(loaded.report);
  const baselineAttestationAudit = assertBaselineAttestation(loaded.report);
  const approvedScopeAudit = assertApprovedScopeAudit(loaded.report);
  const rollbackManifestAudit = assertRollbackManifestIntegrity(loaded.report);
  const result = await legacyRollback.run({
    ...options,
    manifestPath: loaded.reportPath,
  });
  return {
    ...result,
    rolloutReportIntegrity,
    baselineAttestationAudit,
    approvedScopeAudit,
    rollbackManifestAudit,
  };
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_30_NETWORK_ROLLBACK_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  assertContextualRolloutReport,
  assertRollbackManifestIntegrity,
  auditRollbackManifest,
  expectedRollbackEntries,
  manifestFromReport,
  normalizePageSlug,
  readRolloutReport,
  rollbackEntryKey,
  run,
};
