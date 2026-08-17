"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  DEFAULT_TOP_PAGES,
  normalizeOrigin,
  positiveInteger,
  run: runPreview,
} = require("./mse-25-31-network-preview");

const EXPECTED_BRANCH = "feature/mse-25-31-local-seo-quality-uplift";
const DEFAULT_REPORT_DIR = path.join(os.homedir(), "mse-25-31-reports");
const SHA256_PATTERN = /^[0-9a-f]{64}$/i;

function gitValue(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function repositoryState() {
  return {
    branch: gitValue(["branch", "--show-current"]),
    head: gitValue(["rev-parse", "HEAD"]),
    dirty: Boolean(gitValue(["status", "--porcelain"])),
  };
}

function assertRepositoryState(state, { expectedBranch = EXPECTED_BRANCH, allowDirty = false } = {}) {
  if (state.branch !== expectedBranch) {
    const error = new Error(`Branche active inattendue : ${state.branch || "(detached)"}. Attendu : ${expectedBranch}.`);
    error.code = "MSE_25_31_PREFLIGHT_BRANCH_MISMATCH";
    error.details = { actualBranch: state.branch || null, expectedBranch };
    throw error;
  }
  if (state.dirty && !allowDirty) {
    const error = new Error("Le working tree doit être propre avant le preflight MSE-25.31.");
    error.code = "MSE_25_31_PREFLIGHT_DIRTY_WORKTREE";
    throw error;
  }
  return state;
}

function assertSafePreview(preview = {}) {
  if (preview.readOnly !== true || preview.writes !== false || preview.destructive !== false) {
    const error = new Error("Le preflight MSE-25.31 refuse tout preview qui ne garantit pas un mode strictement read-only.");
    error.code = "MSE_25_31_PREFLIGHT_UNSAFE_PREVIEW";
    error.details = {
      readOnly: preview.readOnly,
      writes: preview.writes,
      destructive: preview.destructive,
    };
    throw error;
  }
  return preview;
}

function assertFingerprint(value) {
  const fingerprint = String(value || "").trim().toLowerCase();
  if (!SHA256_PATTERN.test(fingerprint)) {
    const error = new Error("Le preview MSE-25.31 doit fournir un fingerprint SHA-256 valide.");
    error.code = "MSE_25_31_PREFLIGHT_FINGERPRINT_INVALID";
    error.details = { planFingerprint: value || null };
    throw error;
  }
  return fingerprint;
}

function pageKey(value = {}) {
  return `${String(value.siteSlug || "").trim()}:${String(value.pageSlug || "home").trim() || "home"}`;
}

function sortedTypes(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter(Boolean))].sort();
}

function expectedPayloadClassification(payload = {}) {
  const types = sortedTypes((payload.operations || []).map((operation) => operation?.type));
  const complete = [];
  const incomplete = [];
  for (const type of types) {
    if (type === "enrich-body" && payload.bodyCopyPreview?.html && payload.bodyCopyPreview?.title) complete.push(type);
    else incomplete.push(type);
  }
  return { types, complete, incomplete, payloadComplete: types.length > 0 && incomplete.length === 0 };
}

function assertExecutionPayloadCoverage(preview = {}) {
  const pages = Array.isArray(preview.allPages) ? preview.allPages : [];
  const payloads = Array.isArray(preview.executionPayloads) ? preview.executionPayloads : [];
  const payloadByKey = new Map();
  const issues = [];

  for (const payload of payloads) {
    const key = String(payload?.key || pageKey(payload)).trim();
    if (!key || key.startsWith(":")) {
      issues.push({ code: "payload-key-missing", key: key || null });
      continue;
    }
    if (payloadByKey.has(key)) {
      issues.push({ code: "payload-key-duplicate", key });
      continue;
    }
    payloadByKey.set(key, payload);
  }

  for (const page of pages) {
    const key = pageKey(page);
    const pageTypes = sortedTypes(page.operationTypes);
    if (!pageTypes.length) continue;
    const payload = payloadByKey.get(key);
    if (!payload) {
      issues.push({ code: "payload-missing", key, operationTypes: pageTypes });
      continue;
    }
    const classification = expectedPayloadClassification(payload);
    if (JSON.stringify(classification.types) !== JSON.stringify(pageTypes)) {
      issues.push({ code: "payload-operation-mismatch", key, pageTypes, payloadTypes: classification.types });
    }
    if (
      JSON.stringify(sortedTypes(payload.completeOperationTypes)) !== JSON.stringify(classification.complete)
      || JSON.stringify(sortedTypes(payload.incompleteOperationTypes)) !== JSON.stringify(classification.incomplete)
      || payload.payloadComplete !== classification.payloadComplete
    ) {
      issues.push({ code: "payload-classification-mismatch", key });
    }
  }

  const pageKeys = new Set(pages.map(pageKey));
  for (const key of payloadByKey.keys()) {
    if (!pageKeys.has(key)) issues.push({ code: "payload-without-candidate", key });
  }

  if (issues.length > 0) {
    const error = new Error("Les payloads d'exécution scellés ne correspondent pas exactement aux pages candidates du preflight MSE-25.31.");
    error.code = "MSE_25_31_PREFLIGHT_EXECUTION_PAYLOAD_INVALID";
    error.details = { issues };
    throw error;
  }
  return {
    ok: true,
    candidateCount: pages.length,
    payloadCount: payloads.length,
    completePayloadCount: payloads.filter((payload) => payload.payloadComplete === true).length,
    incompletePayloadCount: payloads.filter((payload) => payload.payloadComplete !== true).length,
  };
}

function assertDeterministicExecutionPayloads(first = {}, second = {}) {
  const firstAudit = assertExecutionPayloadCoverage(first);
  const secondAudit = assertExecutionPayloadCoverage(second);
  if (JSON.stringify(first.executionPayloads || []) !== JSON.stringify(second.executionPayloads || [])) {
    const error = new Error("Deux previews successifs ont le même plan SEO mais des payloads d'exécution différents.");
    error.code = "MSE_25_31_PREFLIGHT_NON_DETERMINISTIC_EXECUTION_PAYLOAD";
    throw error;
  }
  return firstAudit.completePayloadCount === secondAudit.completePayloadCount ? firstAudit : firstAudit;
}

function assertDeterministicPreview(first = {}, second = {}) {
  assertSafePreview(first);
  assertSafePreview(second);
  const firstFingerprint = assertFingerprint(first.planFingerprint);
  const secondFingerprint = assertFingerprint(second.planFingerprint);
  if (firstFingerprint !== secondFingerprint) {
    const error = new Error("Deux previews MSE-25.31 successifs ne produisent pas le même fingerprint.");
    error.code = "MSE_25_31_PREFLIGHT_NON_DETERMINISTIC_PLAN";
    error.details = { firstFingerprint, secondFingerprint };
    throw error;
  }
  return firstFingerprint;
}

function reportPath(value) {
  if (value) return path.resolve(value);
  const directory = path.resolve(process.env.MSE_25_31_REPORT_DIR || DEFAULT_REPORT_DIR);
  fs.mkdirSync(directory, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(directory, `mse-25-31-preflight-${stamp}.json`);
}

async function run({
  backendOrigin,
  tenantSlug,
  minimumWords,
  topPages,
  output,
  expectedBranch,
  allowDirty = false,
  emitOutput = true,
  previewRunner = runPreview,
  repositoryReader = repositoryState,
} = {}) {
  const repo = assertRepositoryState(repositoryReader(), {
    expectedBranch: expectedBranch || process.env.MSE_25_31_EXPECTED_BRANCH || EXPECTED_BRANCH,
    allowDirty,
  });
  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
  const resolvedTopPages = positiveInteger(topPages ?? process.env.TOP_PAGES, DEFAULT_TOP_PAGES);
  const resolvedMinimumWords = minimumWords ?? process.env.MINIMUM_WORDS;

  const previewOptions = {
    backendOrigin: origin,
    tenantSlug: tenant,
    minimumWords: resolvedMinimumWords,
    topPages: resolvedTopPages,
    includeAllPages: true,
    emitOutput: false,
  };
  const firstPreview = assertSafePreview(await previewRunner(previewOptions));
  const secondPreview = assertSafePreview(await previewRunner(previewOptions));
  const planFingerprint = assertDeterministicPreview(firstPreview, secondPreview);
  const executionPayloadAudit = assertDeterministicExecutionPayloads(firstPreview, secondPreview);
  const file = reportPath(output || process.env.MSE_25_31_PREFLIGHT_OUTPUT);
  const context = {
    backendOrigin: origin,
    tenantSlug: tenant,
    minimumWords: firstPreview.minimumWords ?? (resolvedMinimumWords === undefined ? null : Number(resolvedMinimumWords)),
    topPages: resolvedTopPages,
  };

  const report = {
    version: "mse-25.31",
    operation: "preflight-quality-uplift",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    destructive: false,
    repository: repo,
    context,
    planFingerprint,
    preview: firstPreview,
    executionPayloadAudit,
    determinism: {
      verified: true,
      previewCount: 2,
      firstFingerprint: planFingerprint,
      secondFingerprint: planFingerprint,
      executionPayloadsVerified: true,
    },
  };
  fs.writeFileSync(file, JSON.stringify(report, null, 2) + "\n", "utf8");

  const result = {
    ok: true,
    readOnly: true,
    writes: false,
    destructive: false,
    reportPath: file,
    repository: repo,
    context,
    planFingerprint,
    candidatePageCount: Array.isArray(firstPreview.allPages) ? firstPreview.allPages.length : 0,
    executionPayloadAudit,
    previewSummary: firstPreview.summary || {},
    operatorSummary: firstPreview.operatorSummary || {},
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      error: error.code || "MSE_25_31_PREFLIGHT_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  DEFAULT_REPORT_DIR,
  EXPECTED_BRANCH,
  SHA256_PATTERN,
  assertDeterministicExecutionPayloads,
  assertDeterministicPreview,
  assertExecutionPayloadCoverage,
  assertFingerprint,
  assertRepositoryState,
  assertSafePreview,
  expectedPayloadClassification,
  gitValue,
  pageKey,
  reportPath,
  repositoryState,
  run,
  sortedTypes,
};
