"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  createApprovalManifest,
  digest,
} = require("./mse-25-31-approval-manifest");
const { loadReport } = require("./mse-25-31-preflight-check");

function loadJson(file, code) {
  const source = String(file || "").trim();
  if (!source) {
    const error = new Error("Un chemin de fichier est obligatoire pour le contrôle d'approbation MSE-25.31.");
    error.code = code;
    throw error;
  }
  const resolved = path.resolve(source);
  if (!fs.existsSync(resolved)) {
    const error = new Error(`Fichier introuvable : ${resolved}`);
    error.code = code;
    throw error;
  }
  return { file: resolved, value: JSON.parse(fs.readFileSync(resolved, "utf8")) };
}

function immutableCandidate(candidate = {}) {
  const { approved, reviewer, reviewedAt, note, ...immutable } = candidate;
  return immutable;
}

function candidateSetFingerprint(planFingerprint, candidates = []) {
  return digest({
    planFingerprint,
    candidates: candidates.map(immutableCandidate),
  });
}

function assertApprovalManifest(manifest = {}, preflightReport = {}) {
  const expected = createApprovalManifest(preflightReport);
  if (manifest.version !== "mse-25.31" || manifest.operation !== "quality-uplift-approval-manifest") {
    const error = new Error("Le manifeste d'approbation MSE-25.31 n'a pas un contrat reconnu.");
    error.code = "MSE_25_31_APPROVAL_MANIFEST_CONTRACT_INVALID";
    throw error;
  }
  if (manifest.publicWrites !== false || manifest.defaultApproval !== false) {
    const error = new Error("Le manifeste d'approbation doit rester deny-by-default et sans écriture publique.");
    error.code = "MSE_25_31_APPROVAL_MANIFEST_SAFETY_INVALID";
    throw error;
  }
  if (manifest.sourcePreflight?.planFingerprint !== expected.sourcePreflight.planFingerprint) {
    const error = new Error("Le manifeste ne correspond pas au fingerprint du preflight source.");
    error.code = "MSE_25_31_APPROVAL_MANIFEST_PREFLIGHT_MISMATCH";
    throw error;
  }
  if (
    manifest.sourcePreflight?.repository?.head !== expected.sourcePreflight.repository.head
    || manifest.sourcePreflight?.repository?.branch !== expected.sourcePreflight.repository.branch
    || manifest.sourcePreflight?.context?.tenantSlug !== expected.sourcePreflight.context.tenantSlug
    || manifest.sourcePreflight?.context?.backendOrigin !== expected.sourcePreflight.context.backendOrigin
    || Number(manifest.sourcePreflight?.context?.minimumWords) !== Number(expected.sourcePreflight.context.minimumWords)
  ) {
    const error = new Error("Le contexte du manifeste ne correspond pas au preflight source.");
    error.code = "MSE_25_31_APPROVAL_MANIFEST_CONTEXT_MISMATCH";
    throw error;
  }

  const candidates = Array.isArray(manifest.candidates) ? manifest.candidates : [];
  if (candidates.length !== expected.candidates.length) {
    const error = new Error("Le nombre de pages du manifeste diffère du preflight source.");
    error.code = "MSE_25_31_APPROVAL_MANIFEST_CANDIDATE_SET_MISMATCH";
    throw error;
  }
  const actualSetFingerprint = candidateSetFingerprint(expected.sourcePreflight.planFingerprint, candidates);
  if (
    manifest.candidateSetFingerprint !== expected.candidateSetFingerprint
    || actualSetFingerprint !== expected.candidateSetFingerprint
  ) {
    const error = new Error("Le jeu de pages ou d'opérations du manifeste a été modifié après le preflight.");
    error.code = "MSE_25_31_APPROVAL_MANIFEST_CANDIDATE_SET_MISMATCH";
    error.details = {
      expectedCandidateSetFingerprint: expected.candidateSetFingerprint,
      manifestCandidateSetFingerprint: manifest.candidateSetFingerprint || null,
      actualCandidateSetFingerprint: actualSetFingerprint,
    };
    throw error;
  }

  const keys = candidates.map((candidate) => candidate.key);
  if (new Set(keys).size !== keys.length) {
    const error = new Error("Le manifeste contient des pages dupliquées.");
    error.code = "MSE_25_31_APPROVAL_MANIFEST_DUPLICATE_CANDIDATE";
    throw error;
  }

  const approved = [];
  for (const candidate of candidates) {
    if (typeof candidate.approved !== "boolean") {
      const error = new Error(`L'approbation de ${candidate.key || "(page inconnue)"} doit être explicitement true ou false.`);
      error.code = "MSE_25_31_APPROVAL_DECISION_REQUIRED";
      throw error;
    }
    if (candidate.approved === true) {
      const reviewer = String(candidate.reviewer || "").trim();
      const reviewedAt = String(candidate.reviewedAt || "").trim();
      if (!reviewer || !reviewedAt || Number.isNaN(Date.parse(reviewedAt))) {
        const error = new Error(`La page approuvée ${candidate.key} doit préciser reviewer et reviewedAt.`);
        error.code = "MSE_25_31_APPROVAL_AUDIT_REQUIRED";
        error.details = { key: candidate.key };
        throw error;
      }
      approved.push(candidate);
    }
  }

  return {
    ok: true,
    publicWrites: false,
    planFingerprint: expected.sourcePreflight.planFingerprint,
    candidateSetFingerprint: expected.candidateSetFingerprint,
    summary: {
      candidateCount: candidates.length,
      approvedCount: approved.length,
      pendingOrRejectedCount: candidates.length - approved.length,
      approvedManualReviewCount: approved.filter((candidate) => candidate.executionClass === "manual-review-needed").length,
    },
    approvedPages: approved.map((candidate) => ({
      key: candidate.key,
      siteSlug: candidate.siteSlug,
      pageSlug: candidate.pageSlug,
      reviewer: candidate.reviewer,
      reviewedAt: candidate.reviewedAt,
    })),
  };
}

function run({ approvalManifestPath, preflightReportPath, emitOutput = true } = {}) {
  const approvalSource = approvalManifestPath || process.env.MSE_25_31_APPROVAL_MANIFEST;
  const preflightSource = preflightReportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const { file: approvalFile, value: manifest } = loadJson(approvalSource, "MSE_25_31_APPROVAL_MANIFEST_NOT_FOUND");
  const { file: preflightFile, report } = loadReport(preflightSource);
  const result = {
    ...assertApprovalManifest(manifest, report),
    approvalManifestPath: approvalFile,
    preflightReportPath: preflightFile,
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
      error: error.code || "MSE_25_31_APPROVAL_CHECK_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  assertApprovalManifest,
  candidateSetFingerprint,
  immutableCandidate,
  loadJson,
  run,
};
