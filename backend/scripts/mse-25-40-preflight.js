"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { run: runPreview } = require("./mse-25-40-network-preview");

const EXPECTED_BRANCH = "feature/mse-25-40-local-seo-semantic-engine";

function git(args) { return execFileSync("git", args, { encoding: "utf8" }).trim(); }
function repositoryState() {
  return { branch: git(["branch", "--show-current"]), head: git(["rev-parse", "HEAD"]), dirty: Boolean(git(["status", "--porcelain"])) };
}

function assertRepository(state) {
  if (state.branch !== EXPECTED_BRANCH) {
    const error = new Error(`Branche active inattendue : ${state.branch}. Attendu : ${EXPECTED_BRANCH}.`);
    error.code = "MSE_25_40_BRANCH_MISMATCH";
    throw error;
  }
  if (state.dirty) {
    const error = new Error("Le working tree doit être propre avant le preflight MSE-25.40.");
    error.code = "MSE_25_40_DIRTY_WORKTREE";
    throw error;
  }
  return state;
}

function assertSafetyPolicy(preview = {}) {
  const policy = preview.policy || {};
  const issues = [];
  if (policy.doorwayGuard !== true) issues.push("doorwayGuard");
  if (policy.locationExpansion !== false) issues.push("locationExpansion");
  if (policy.preferExistingPages !== true) issues.push("preferExistingPages");
  if (policy.newPageEvidenceGate !== true) issues.push("newPageEvidenceGate");
  if (policy.managedRoutesAware !== true) issues.push("managedRoutesAware");
  if (policy.autoCreatePages !== false) issues.push("autoCreatePages");
  if (policy.autoPublishPages !== false) issues.push("autoPublishPages");
  if (policy.automaticWrites !== false) issues.push("automaticWrites");
  if (preview.readOnly !== true || preview.writes !== false || preview.destructive !== false) issues.push("readOnlyContract");
  if ((preview.summary?.automaticWriteCount || 0) !== 0) issues.push("automaticWriteCount");
  if (issues.length) {
    const error = new Error(`Politique de sécurité sémantique invalide : ${issues.join(", ")}.`);
    error.code = "MSE_25_40_SEMANTIC_SAFETY_GUARD_DISABLED";
    error.details = { issues };
    throw error;
  }
}

async function run({ backendOrigin, tenantSlug, output, emitOutput = true, previewRunner = runPreview, repositoryReader = repositoryState } = {}) {
  const repository = assertRepository(repositoryReader());
  const options = { backendOrigin: backendOrigin || process.env.BACKEND_ORIGIN, tenantSlug: tenantSlug || process.env.TENANT_SLUG || "mondescale", emitOutput: false };
  const first = await previewRunner(options);
  const second = await previewRunner(options);
  if (first.planFingerprint !== second.planFingerprint || JSON.stringify(first.summary || {}) !== JSON.stringify(second.summary || {})) {
    const error = new Error("Deux previews MSE-25.40 successifs ne sont pas déterministes.");
    error.code = "MSE_25_40_NON_DETERMINISTIC_PREVIEW";
    error.details = { firstFingerprint: first.planFingerprint || null, secondFingerprint: second.planFingerprint || null };
    throw error;
  }
  assertSafetyPolicy(first);

  const directory = path.resolve(process.env.MSE_25_40_REPORT_DIR || path.join(os.homedir(), "mse-25-40-reports"));
  fs.mkdirSync(directory, { recursive: true });
  const target = path.resolve(output || process.env.MSE_25_40_PREFLIGHT_OUTPUT || path.join(directory, `mse-25-40-preflight-${new Date().toISOString().replace(/[:.]/g, "-")}.json`));
  const report = {
    version: "mse-25.40",
    operation: "semantic-preflight",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    destructive: false,
    repository,
    context: options,
    determinism: { verified: true, previewCount: 2, planFingerprint: first.planFingerprint },
    safety: {
      verified: true,
      doorwayGuard: true,
      preferExistingPages: true,
      newPageEvidenceGate: true,
      managedRoutesAware: true,
      automaticWrites: false,
    },
    preview: first,
  };
  fs.writeFileSync(target, JSON.stringify(report, null, 2) + "\n", "utf8");
  const result = {
    ok: true,
    readOnly: true,
    writes: false,
    destructive: false,
    reportPath: target,
    repository,
    planFingerprint: first.planFingerprint,
    summary: first.summary,
    excludedSites: first.excludedSites || [],
    safety: report.safety,
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_40_PREFLIGHT_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { EXPECTED_BRANCH, assertRepository, assertSafetyPolicy, repositoryState, run };
