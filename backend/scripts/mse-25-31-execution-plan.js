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

function operationWriteTarget(page = {}, operation = {}, index = 0) {
  const siteSlug = String(page.siteSlug || "").trim();
  const pageSlug = String(page.pageSlug || "home").trim() || "home";
  if (!siteSlug || !operation?.type) return null;

  const base = {
    candidateKey: page.key,
    operationType: operation.type,
    operationIndex: index,
    sourceValueFingerprint: operation.sourceValueFingerprint || null,
    linkHref: operation.link?.href || null,
  };

  if (operation.type === "enrich-body") {
    return {
      ...base,
      targetKey: `${siteSlug}:${pageSlug}:blocks:append-editorial-copy`,
    };
  }
  if (operation.type === "strengthen-title") {
    return {
      ...base,
      targetKey: `${siteSlug}:${pageSlug}:page:seoTitle`,
    };
  }
  if (operation.type === "strengthen-meta-description") {
    return {
      ...base,
      targetKey: `${siteSlug}:${pageSlug}:page:metaDescription`,
    };
  }
  if (operation.type === "strengthen-h1") {
    const blockId = operation.target?.blockId;
    if (blockId === null || blockId === undefined) return null;
    return {
      ...base,
      targetKey: `${siteSlug}:${pageSlug}:block:${String(blockId)}:title`,
    };
  }
  if (operation.type === "add-internal-link") {
    const sourcePageSlug = String(operation.target?.pageSlug || "").trim();
    const blockId = operation.target?.blockId;
    if (!sourcePageSlug || blockId === null || blockId === undefined) return null;
    return {
      ...base,
      targetKey: `${siteSlug}:${sourcePageSlug}:block:${String(blockId)}:content.html`,
    };
  }
  return null;
}

function mergeableInternalLinkGroup(rows = []) {
  if (rows.length < 2 || !rows.every((row) => row.operationType === "add-internal-link")) return false;
  const fingerprints = new Set(rows.map((row) => String(row.sourceValueFingerprint || "").toLowerCase()));
  const hrefs = rows.map((row) => String(row.linkHref || "").trim());
  return fingerprints.size === 1
    && /^[0-9a-f]{64}$/.test([...fingerprints][0] || "")
    && hrefs.every(Boolean)
    && new Set(hrefs).size === hrefs.length;
}

function writeTargetGroups(pages = []) {
  const byTarget = new Map();
  for (const page of pages || []) {
    const operations = page.executionPayload?.operations || [];
    operations.forEach((operation, index) => {
      const target = operationWriteTarget(page, operation, index);
      if (!target) return;
      const rows = byTarget.get(target.targetKey) || [];
      rows.push(target);
      byTarget.set(target.targetKey, rows);
    });
  }

  const mergeable = [];
  const collisions = [];
  for (const [targetKey, writes] of byTarget.entries()) {
    if (writes.length <= 1) continue;
    const group = { targetKey, writes };
    if (mergeableInternalLinkGroup(writes)) mergeable.push(group);
    else collisions.push(group);
  }

  const sort = (left, right) => left.targetKey.localeCompare(right.targetKey, "fr");
  return { mergeable: mergeable.sort(sort), collisions: collisions.sort(sort) };
}

function writeTargetCollisions(pages = []) {
  return writeTargetGroups(pages).collisions;
}

function mergeableWriteTargetGroups(pages = []) {
  return writeTargetGroups(pages).mergeable;
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
  const incompletePages = pages.filter((page) => page.executionPayloadComplete !== true);
  const groups = writeTargetGroups(pages);
  const collisions = groups.collisions;
  const mergeableWriteTargets = groups.mergeable;

  const executionPlanFingerprint = digest({
    version: "mse-25.31",
    planFingerprint: verifiedApproval.planFingerprint,
    candidateSetFingerprint: verifiedApproval.candidateSetFingerprint,
    approvalDecisionFingerprint,
    pages,
    mergeableWriteTargets,
    writeTargetCollisions: collisions,
  });

  return {
    version: "mse-25.31",
    operation: "quality-uplift-execution-plan",
    generatedAt: new Date().toISOString(),
    readOnly: true,
    writes: false,
    destructive: false,
    publicWrites: false,
    executable: pages.length > 0 && incompletePages.length === 0 && collisions.length === 0,
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
      mergeableWriteTargetGroupCount: mergeableWriteTargets.length,
      mergedInternalLinkOperationCount: mergeableWriteTargets.reduce((sum, group) => sum + group.writes.length, 0),
      writeTargetCollisionCount: collisions.length,
      projectedWarningReduction: pages.reduce((sum, page) => sum + Number(page.projectedReduction || 0), 0),
    },
    incompletePages: incompletePages.map((page) => ({
      key: page.key,
      incompleteOperationTypes: page.incompleteOperationTypes,
    })),
    mergeableWriteTargets,
    writeTargetCollisions: collisions,
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
    mergeableWriteTargets: plan.mergeableWriteTargets,
    writeTargetCollisions: plan.writeTargetCollisions,
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
  mergeableInternalLinkGroup,
  mergeableWriteTargetGroups,
  operationWriteTarget,
  run,
  writeTargetCollisions,
  writeTargetGroups,
};
