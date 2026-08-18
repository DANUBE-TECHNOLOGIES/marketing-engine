"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { loadJson } = require("./mse-25-31-approval-check");
const { assertExecutionPlan } = require("./mse-25-31-execution-plan-check");
const { loadReport } = require("./mse-25-31-preflight-check");
const { jsonRequest, normalizeOrigin } = require("./mse-25-31-network-preview");
const { buildQualityUpliftWriteIntents } = require("../src/modules/minisite-seo-enrichment/quality-uplift-write-intent");

function touchedPageRequests(executionPlan = {}) {
  const map = new Map();
  for (const page of executionPlan.pages || []) {
    const add = (pageSlug) => {
      const slug = String(pageSlug || "home").trim() || "home";
      const key = `${page.siteSlug}:${slug}`;
      if (!map.has(key)) map.set(key, { key, agencyId: page.agencyId, siteSlug: page.siteSlug, pageSlug: slug });
    };
    add(page.pageSlug);
    for (const operation of page.executionPayload?.operations || []) {
      if (operation.type === "add-internal-link") add(operation.target?.pageSlug);
    }
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key, "fr"));
}

async function fetchCurrentPages(executionPlan, { backendOrigin, tenantSlug, request = jsonRequest } = {}) {
  const origin = normalizeOrigin(backendOrigin);
  const tenant = String(tenantSlug || "mondescale").trim();
  const rows = [];
  for (const target of touchedPageRequests(executionPlan)) {
    const page = await request(`${origin}/agencies/${encodeURIComponent(target.agencyId)}/site/pages/${encodeURIComponent(target.pageSlug)}/blocks`, {
      method: "GET",
      headers: { "x-tenant-slug": tenant },
    });
    rows.push({ agencyId: target.agencyId, siteSlug: target.siteSlug, page });
  }
  return rows;
}

function defaultOutputPath(executionPlanPath, result) {
  const directory = path.dirname(path.resolve(executionPlanPath));
  return path.join(directory, `mse-25-31-write-intent-${String(result.executionPlanFingerprint || "unknown").slice(0, 12)}.json`);
}

async function run({ executionPlanPath, approvalManifestPath, preflightReportPath, backendOrigin, tenantSlug, output, emitOutput = true, request = jsonRequest } = {}) {
  const executionSource = executionPlanPath || process.env.MSE_25_31_EXECUTION_PLAN;
  const approvalSource = approvalManifestPath || process.env.MSE_25_31_APPROVAL_MANIFEST;
  const preflightSource = preflightReportPath || process.env.MSE_25_31_PREFLIGHT_REPORT;
  const { file: executionFile, value: executionPlan } = loadJson(executionSource, "MSE_25_31_EXECUTION_PLAN_NOT_FOUND");
  const { value: approvalManifest } = loadJson(approvalSource, "MSE_25_31_APPROVAL_MANIFEST_NOT_FOUND");
  const { report: preflightReport } = loadReport(preflightSource);
  const verified = assertExecutionPlan(executionPlan, approvalManifest, preflightReport);
  if (!verified.executable) {
    const error = new Error("Le plan MSE-25.31 n'est pas exécutable ; aucun write-intent ne peut être construit.");
    error.code = "MSE_25_31_WRITE_INTENT_PLAN_NOT_EXECUTABLE";
    throw error;
  }
  const currentPages = await fetchCurrentPages(executionPlan, {
    backendOrigin: backendOrigin || process.env.BACKEND_ORIGIN || preflightReport.context?.backendOrigin,
    tenantSlug: tenantSlug || process.env.TENANT_SLUG || preflightReport.context?.tenantSlug,
    request,
  });
  const result = buildQualityUpliftWriteIntents({ executionPlan, currentPages });
  const target = path.resolve(output || process.env.MSE_25_31_WRITE_INTENT_OUTPUT || defaultOutputPath(executionFile, result));
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + "\n", "utf8");
  const summary = { ok: true, readOnly: true, writes: false, publicWrites: false, persistenceCallsPerformed: 0, executionPlanFingerprint: result.executionPlanFingerprint, touchedPageCount: result.summary.touchedPageCount, writeIntentPath: target };
  if (emitOutput) console.log(JSON.stringify(summary, null, 2));
  return { ...summary, result };
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, publicWrites: false, error: error.code || "MSE_25_31_WRITE_INTENT_FAILED", message: error.message, details: error.details || {} }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { defaultOutputPath, fetchCurrentPages, run, touchedPageRequests };
