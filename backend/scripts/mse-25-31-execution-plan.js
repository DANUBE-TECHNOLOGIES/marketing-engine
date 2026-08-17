"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  assertApprovalManifest,
  loadJson,
} = require("./mse-25-31-approval-check");
const {
  digest,
} = require("./mse-25-31-approval-manifest");
const { loadReport } = require("./mse-25-31-preflight-check");

function executionPayloadMap(preflightReport = {}) {
  return new Map(
    (Array.isArray(preflightReport.preview?.executionPayloads) ? preflightReport.preview.executionPayloads : [])
      .map((payload) => [String(payload.key || ""), payload])
      .filter(([key]) => key)
  );
}

function approvedExecutionRows(manifest = {}, preflightReport = {}) {
  const payloads = executionPayloadMap(preflightReport);
  return (manifest.candidates || [])
    .filter((candidate) => candidate.approved === true)
    .map((candidate) => {
      const sealedPayload = payloads.get(String(candidate.key || "")) || null;
      return {
        key: candidate.key,
        agencyId: candidate.agencyId ?? null,
        siteSlug: candidate.siteSlug,
        city: candidate.city || null,
        pageSlug: candidate.pageSlug || "home",
        priority: candidate.priority || "low",
        priorityScore: Number(candidate.priorityScore || 0),
        executionClass: candidate.executionClass || null,
        projectedReduction: Number(candidate.projectedReduction || 0),
        operationTypes: Array.isArray(candidate.operationTypes) ? [...candidate.operationTypes] : [],
        manualReviewReasons: Array.isArray(candidate.manualReviewReasons) ? [...candidate.manualReviewReasons] : [],
        executionPayloadComplete: sealedPayload?.payloadComplete === true,
        incompleteOperationTypes: Array.isArray(sealedPayload?.incompleteOperationTypes)
          ? [...sealedPayload.incompleteOperationTypes]
          : [...(candidate.operationTypes || [])],
        executionPayload: sealedPayload ? JSON.parse(JSON.stringify(sealedPayload)) : null,
        approval: {
          reviewer: String(candidate.reviewer || "").trim(),
          reviewedAt: String(candidate.reviewedAt || "").trim(),
          note: candidate.note ?? null,
        },
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key, "fr"));
}

function buildExecutionPlan(manifest = {}, preflightReport = {}) {
  const verifiedApproval = assertApprovalManifest(manifest, preflightReport);
  const pages = approvedExecutionRows(manifest, preflightReport);
  const approvalDecisionFingerprint = digest({
    planFingerprint: verifiedApproval.planFingerprint,
    candidateSetFingerprint: verifiedApproval.candidateSetFingerprint,
    decisions: pages.map((page) => ({
      key: page.key,
      reviewer: page.approval.reviewer,
      reviewedAt: page.approval.reviewedAt,
      note: page.approval.note,
    })),
  });

  const executionPlanFingerprint = digest({
    version: "mse-25.31",
    planFingerprint: verifiedApproval.planFingerprint,
    candidateSetFingerprint: verifiedApproval.candidateSetFingerprint,
    approvalDecisionFingerprint,
    pages,
  });
  const incompletePages = pages.filter((page) => page.executionPayloadComplete !== true);

  return {
    version: "mse-25.31",
    operation: "quality-uplift-execution-plan",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    destructive: false,
    publicWrites: false,
    executable: pages.length > 0 && incompletePages.length === 0,
    source: {
      repository: {
        branch: preflightReport.repository?.branch || null,
        head: preflightReport.repository?.head || null,
      },
      context: JSON.parse(JSON.stringify(preflightReport.context || {})),
      planFingerprint: verifiedApproval.planFingerprint,
      candidateSetFingerprint: verifiedApproval.candidateSetFingerprint,
      approvalDecisionFingerprint,
    },
    executionPlanFingerprint,
    summary: {
      candidateCount: verifiedApproval.summary.candidateCount,
      approvedCount: pages.length,
      skippedCount: verifiedApproval.summary.candidateCount - pages.length,
      approvedManualReviewCount: pages.filter((page) => page.executionClass === "manual-review-needed").length,
      payloadCompleteCount: pages.length - incompletePages.length,
      payloadIncompleteCount: incompletePages.length,
      projectedWarningReduction: pages.reduce((sum, page) => sum + Number(page.projectedReduction || 0), 0),
    },
    incompletePages: incompletePages.map((page) => ({
      key: page.key,
      incompleteOperationTypes: page.incompleteOperationTypes,
    })),
    pages,
  };
}

function defaultOutputPath(approvalManifestPath, plan) {
  const directory = path.dirname(path.resolve(approvalManifestPath));
  return path.join(directory, `mse-25-31-execution-${plan.executionPlanFingerprint.slice(0, 12)}.json`);
}

function run({ approvalManifestPath, preflightReportPath, output, emitOutput = true } = {}) {
  const approvalSource = approvalManifestPath || process.env.MSE_25_31_APPROVAL_MANIFEST;
  const preflightSource = preflightReportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const { file: approvalFile, value: manifest } = loadJson(approvalSource, "MSE_25_31_APPROVAL_MANIFEST_NOT_FOUND");
  const { file: preflightFile, report } = loadReport(preflightSource);
  const plan = buildExecutionPlan(manifest, report);
  const target = path.resolve(output || process.env.MSE_25_31_EXECUTION_PLAN_OUTPUT || defaultOutputPath(approvalFile, plan));
  fs.writeFileSync(target, JSON.stringify(plan, null, 2) + "\n", "utf8");

  const result = {
    ok: true,
    readOnly: true,
    writes: false,
    destructive: false,
    publicWrites: false,
    executable: plan.executable,
    approvalManifestPath: approvalFile,
    preflightReportPath: preflightFile,
    executionPlanPath: target,
    executionPlanFingerprint: plan.executionPlanFingerprint,
    approvalDecisionFingerprint: plan.source.approvalDecisionFingerprint,
    summary: plan.summary,
    incompletePages: plan.incompletePages,
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
      error: error.code || "MSE_25_31_EXECUTION_PLAN_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  approvedExecutionRows,
  buildExecutionPlan,
  defaultOutputPath,
  executionPayloadMap,
  run,
};
