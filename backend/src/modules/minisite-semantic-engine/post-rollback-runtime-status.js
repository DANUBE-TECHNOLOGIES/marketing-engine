"use strict";

const fs = require("node:fs");
const path = require("node:path");

function latestJson(dir, prefix) {
  if (!dir || !fs.existsSync(dir)) return null;
  return fs.readdirSync(dir)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".json"))
    .map((name) => {
      const file = path.join(dir, name);
      return { file, mtimeMs: fs.statSync(file).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.file || null;
}

function readJson(file) {
  if (!file || !fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { return { __readError: error.message }; }
}

function buildPostRollbackRuntimeStatus({ env = process.env } = {}) {
  const rollbackDir = env.MSE_25_67_REPORT_DIR || "/home/admin1/mse-25-67-reports";
  const verificationDir = env.MSE_25_68_REPORT_DIR || "/home/admin1/mse-25-68-reports";
  const rollbackReportPath = env.MSE_25_68_ROLLBACK_REPORT || latestJson(rollbackDir, "mse-25-67-guarded-rollback-");
  const verificationReportPath = env.MSE_25_68_VERIFICATION_REPORT || latestJson(verificationDir, "mse-25-68-post-rollback-verification-");

  const rollback = readJson(rollbackReportPath);
  const verification = readJson(verificationReportPath);
  const audit = rollback?.audit;
  const certification = verification?.certification;

  const rollbackCertified = Boolean(
    audit && audit.type === "MSE_25_67_GUARDED_ROLLBACK_AUDIT" &&
    audit.transactional === true && audit.automaticRollback === false &&
    audit.pageCreated === false && audit.published === false && audit.auditFingerprint
  );

  const verificationProvenanceMatches = Boolean(
    rollbackReportPath &&
    verification?.sourceRollbackReportPath === rollbackReportPath &&
    verification?.verification?.sourceRollbackAuditFingerprint === audit?.auditFingerprint
  );

  const verificationCertified = Boolean(
    verification && verification.type === "MSE_25_68_POST_ROLLBACK_VERIFICATION_REPORT" &&
    verification.certified === true && certification?.certified === true &&
    verification.readOnly === true && verification.writes === false &&
    verification.publicWrites === false && verificationProvenanceMatches
  );

  const readError = rollback?.__readError || verification?.__readError || null;
  let status = "waiting";
  let state = "WAITING_FOR_GUARDED_ROLLBACK_AUDIT";
  let reason = "NO_CERTIFIED_GUARDED_ROLLBACK_AUDIT_AVAILABLE";

  if (readError) {
    status = "error";
    state = "RUNTIME_REPORT_UNREADABLE";
    reason = readError;
  } else if (rollbackCertified && verification && !verificationProvenanceMatches) {
    status = "attention";
    state = "POST_ROLLBACK_VERIFICATION_PROVENANCE_MISMATCH";
    reason = "LATEST_VERIFICATION_DOES_NOT_BELONG_TO_LATEST_ROLLBACK";
  } else if (rollbackCertified && !verificationCertified) {
    status = "attention";
    state = "READY_FOR_POST_ROLLBACK_VERIFICATION";
    reason = "CERTIFIED_GUARDED_ROLLBACK_AUDIT_AVAILABLE";
  } else if (rollbackCertified && verificationCertified) {
    status = verification?.verification?.manualInterventionRequired ? "attention" : "healthy";
    state = verification?.verification?.manualInterventionRequired ? "POST_ROLLBACK_MANUAL_INTERVENTION_REQUIRED" : "POST_ROLLBACK_VERIFIED";
    reason = verification?.verification?.manualInterventionRequired ? "VERIFICATION_REQUIRES_MANUAL_INTERVENTION" : "CERTIFIED_POST_ROLLBACK_VERIFICATION_AVAILABLE";
  }

  return {
    ok: status !== "error",
    type: "POST_ROLLBACK_RUNTIME_STATUS",
    generatedAt: new Date().toISOString(),
    status, state, reason,
    readOnly: true, writes: false, publicWrites: false,
    rollback: {
      available: Boolean(rollbackReportPath), certified: rollbackCertified,
      reportPath: rollbackReportPath, auditFingerprint: audit?.auditFingerprint || null,
      pageIdentity: audit?.pageIdentity || null, siteSlug: audit?.siteSlug || null, page: audit?.page || null,
    },
    verification: {
      available: Boolean(verificationReportPath), certified: verificationCertified,
      provenanceMatches: verificationProvenanceMatches,
      reportPath: verificationReportPath,
      sourceRollbackReportPath: verification?.sourceRollbackReportPath || null,
      sourceRollbackAuditFingerprint: verification?.verification?.sourceRollbackAuditFingerprint || null,
      generatedAt: verification?.generatedAt || null,
      incidentRecovered: verification?.verification?.incidentRecovered ?? null,
      manualInterventionRequired: verification?.verification?.manualInterventionRequired ?? null,
      fingerprint: verification?.verification?.verificationFingerprint || null,
      reasons: certification?.reasons || [],
    },
    invariants: {
      automaticRepairForbidden: true,
      automaticWriteCount: 0,
      pageCreationCount: 0,
      publicationCount: 0,
      websiteDesignerMutationCount: 0,
    },
  };
}

module.exports = { buildPostRollbackRuntimeStatus, latestJson, readJson };
