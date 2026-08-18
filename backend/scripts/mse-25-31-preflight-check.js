"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  EXPECTED_BRANCH,
  assertExecutionPayloadCoverage,
  assertFingerprint,
  assertSafePreview,
} = require("./mse-25-31-preflight");
const { normalizeOrigin } = require("./mse-25-31-network-preview");

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

function loadReport(file) {
  const resolved = path.resolve(String(file || "").trim());
  if (!resolved || !fs.existsSync(resolved)) {
    const error = new Error("Le rapport de preflight MSE-25.31 est introuvable.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_NOT_FOUND";
    error.details = { reportPath: resolved || null };
    throw error;
  }
  return { file: resolved, report: JSON.parse(fs.readFileSync(resolved, "utf8")) };
}

function assertExecutionPayloadAudit(report = {}) {
  const recomputed = assertExecutionPayloadCoverage(report.preview || {});
  const recorded = report.executionPayloadAudit || {};
  const determinism = report.determinism || {};
  const fields = ["candidateCount", "payloadCount", "completePayloadCount", "incompletePayloadCount"];
  const mismatches = fields
    .filter((field) => Number(recorded[field]) !== Number(recomputed[field]))
    .map((field) => ({ field, recorded: recorded[field] ?? null, recomputed: recomputed[field] }));

  if (recorded.ok !== true || determinism.executionPayloadsVerified !== true || mismatches.length > 0) {
    const error = new Error("La preuve de couverture des payloads d'exécution du preflight MSE-25.31 est absente ou désynchronisée.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_EXECUTION_PAYLOAD_AUDIT_INVALID";
    error.details = { mismatches, executionPayloadsVerified: determinism.executionPayloadsVerified === true };
    throw error;
  }
  return recomputed;
}

function assertReport(report = {}, {
  expectedBranch = EXPECTED_BRANCH,
  expectedHead,
  backendOrigin,
  tenantSlug,
  minimumWords,
} = {}) {
  if (report.version !== "mse-25.31" || report.operation !== "preflight-quality-uplift") {
    const error = new Error("Le fichier fourni n'est pas un rapport de preflight MSE-25.31 reconnu.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_CONTRACT_INVALID";
    throw error;
  }
  if (report.readOnly !== true || report.writes !== false || report.destructive !== false) {
    const error = new Error("Le rapport de preflight n'atteste pas un mode strictement read-only.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_UNSAFE";
    throw error;
  }

  const planFingerprint = assertFingerprint(report.planFingerprint);
  assertSafePreview(report.preview || {});
  if (assertFingerprint(report.preview?.planFingerprint) !== planFingerprint) {
    const error = new Error("Le fingerprint du preview ne correspond pas au fingerprint du rapport.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_FINGERPRINT_MISMATCH";
    throw error;
  }

  const determinism = report.determinism || {};
  if (
    determinism.verified !== true
    || Number(determinism.previewCount) !== 2
    || assertFingerprint(determinism.firstFingerprint) !== planFingerprint
    || assertFingerprint(determinism.secondFingerprint) !== planFingerprint
  ) {
    const error = new Error("La preuve de déterminisme du rapport MSE-25.31 est incohérente.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_DETERMINISM_INVALID";
    throw error;
  }
  const executionPayloadAudit = assertExecutionPayloadAudit(report);

  const repository = report.repository || {};
  if (repository.branch !== expectedBranch) {
    const error = new Error("La branche du rapport de preflight ne correspond pas à la branche attendue.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_BRANCH_MISMATCH";
    error.details = { actualBranch: repository.branch || null, expectedBranch };
    throw error;
  }
  const head = String(repository.head || "").trim().toLowerCase();
  if (!COMMIT_SHA_PATTERN.test(head)) {
    const error = new Error("Le HEAD Git enregistré dans le rapport MSE-25.31 est invalide.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_HEAD_INVALID";
    throw error;
  }
  if (expectedHead && head !== String(expectedHead).trim().toLowerCase()) {
    const error = new Error("Le HEAD Git du rapport ne correspond pas au HEAD attendu.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_HEAD_MISMATCH";
    error.details = { actualHead: head, expectedHead: String(expectedHead).trim().toLowerCase() };
    throw error;
  }

  const context = report.context || {};
  if (!String(context.tenantSlug || "").trim() || !String(context.backendOrigin || "").trim()) {
    const error = new Error("Le contexte backend/tenant du rapport MSE-25.31 est incomplet.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_CONTEXT_INVALID";
    throw error;
  }
  if (backendOrigin && normalizeOrigin(context.backendOrigin) !== normalizeOrigin(backendOrigin)) {
    const error = new Error("L'origine backend du rapport ne correspond pas au contexte attendu.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_BACKEND_MISMATCH";
    throw error;
  }
  if (tenantSlug && String(context.tenantSlug).trim() !== String(tenantSlug).trim()) {
    const error = new Error("Le tenant du rapport ne correspond pas au contexte attendu.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_TENANT_MISMATCH";
    throw error;
  }
  if (minimumWords !== undefined && Number(context.minimumWords) !== Number(minimumWords)) {
    const error = new Error("Le seuil minimumWords du rapport ne correspond pas au paramètre attendu.");
    error.code = "MSE_25_31_PREFLIGHT_REPORT_PARAMETER_MISMATCH";
    throw error;
  }

  return {
    ok: true,
    version: report.version,
    readOnly: true,
    writes: false,
    destructive: false,
    repository: { branch: repository.branch, head },
    context,
    planFingerprint,
    executionPayloadAudit,
  };
}

function run({ reportPath, expectedBranch, expectedHead, backendOrigin, tenantSlug, minimumWords, emitOutput = true } = {}) {
  const source = reportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const { file, report } = loadReport(source);
  const result = {
    ...assertReport(report, {
      expectedBranch: expectedBranch || process.env.MSE_25_31_EXPECTED_BRANCH || EXPECTED_BRANCH,
      expectedHead: expectedHead || process.env.MSE_25_31_EXPECTED_HEAD,
      backendOrigin: backendOrigin || process.env.BACKEND_ORIGIN,
      tenantSlug: tenantSlug || process.env.TENANT_SLUG,
      minimumWords: minimumWords ?? process.env.MINIMUM_WORDS,
    }),
    reportPath: file,
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_31_PREFLIGHT_REPORT_CHECK_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  COMMIT_SHA_PATTERN,
  assertExecutionPayloadAudit,
  assertReport,
  loadReport,
  run,
};
