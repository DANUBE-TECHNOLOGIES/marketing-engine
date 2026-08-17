"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { assertReport, loadReport } = require("./mse-25-31-preflight-check");

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
}

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableValue(value))).digest("hex");
}

function candidateKey(row = {}) {
  return `${String(row.siteSlug || "").trim()}:${String(row.pageSlug || "home").trim() || "home"}`;
}

function approvalCandidates(report = {}) {
  const rows = Array.isArray(report.preview?.allPages) ? report.preview.allPages : [];
  const seen = new Set();
  const candidates = rows.map((row) => {
    const key = candidateKey(row);
    if (!String(row.siteSlug || "").trim() || seen.has(key)) {
      const error = new Error("Le jeu de pages du preflight MSE-25.31 est incomplet ou contient un doublon.");
      error.code = "MSE_25_31_APPROVAL_CANDIDATE_SET_INVALID";
      error.details = { key };
      throw error;
    }
    seen.add(key);
    return {
      key,
      agencyId: row.agencyId ?? null,
      siteSlug: row.siteSlug,
      city: row.city || null,
      pageSlug: row.pageSlug || "home",
      priority: row.priority || "low",
      priorityScore: Number(row.priorityScore || 0),
      executionClass: row.executionClass || null,
      projectedReduction: Number(row.projectedReduction || 0),
      operationTypes: row.operationTypes || [],
      manualReviewReasons: row.manualReviewReasons || [],
      approved: false,
      reviewer: null,
      reviewedAt: null,
      note: null,
    };
  });
  return candidates.sort((left, right) => left.key.localeCompare(right.key, "fr"));
}

function createApprovalManifest(report = {}) {
  const verified = assertReport(report);
  const candidates = approvalCandidates(report);
  const candidateSetFingerprint = digest({
    planFingerprint: verified.planFingerprint,
    candidates: candidates.map(({ approved, reviewer, reviewedAt, note, ...candidate }) => candidate),
  });
  return {
    version: "mse-25.31",
    operation: "quality-uplift-approval-manifest",
    generatedAt: new Date().toISOString(),
    publicWrites: false,
    defaultApproval: false,
    sourcePreflight: {
      repository: { ...(verified.repository || {}) },
      context: { ...(verified.context || {}) },
      planFingerprint: verified.planFingerprint,
    },
    candidateSetFingerprint,
    summary: {
      candidateCount: candidates.length,
      approvedCount: 0,
      rejectedOrPendingCount: candidates.length,
      manualReviewNeededCount: candidates.filter((item) => item.executionClass === "manual-review-needed").length,
    },
    candidates,
  };
}

function defaultOutputPath(reportPath, manifest) {
  const directory = path.dirname(path.resolve(reportPath));
  return path.join(directory, `mse-25-31-approval-${manifest.sourcePreflight.planFingerprint.slice(0, 12)}.json`);
}

function run({ reportPath, output, emitOutput = true } = {}) {
  const source = reportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const { file, report } = loadReport(source);
  const manifest = createApprovalManifest(report);
  const target = path.resolve(output || process.env.MSE_25_31_APPROVAL_OUTPUT || defaultOutputPath(file, manifest));
  fs.writeFileSync(target, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  const result = {
    ok: true,
    publicWrites: false,
    defaultApproval: false,
    reportPath: file,
    approvalManifestPath: target,
    planFingerprint: manifest.sourcePreflight.planFingerprint,
    candidateSetFingerprint: manifest.candidateSetFingerprint,
    summary: manifest.summary,
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
      error: error.code || "MSE_25_31_APPROVAL_MANIFEST_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  approvalCandidates,
  candidateKey,
  createApprovalManifest,
  defaultOutputPath,
  digest,
  run,
  stableValue,
};
