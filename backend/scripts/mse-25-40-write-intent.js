"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { jsonRequest, normalizeOrigin } = require("./mse-25-31-network-preview");
const { buildResidualWriteIntent } = require("../src/modules/minisite-semantic-engine/residual-write-intent");

function loadJson(file, code) {
  if (!file) {
    const error = new Error("Rapport MSE-25.40 requis.");
    error.code = code;
    throw error;
  }
  const resolved = path.resolve(file);
  return { file: resolved, value: JSON.parse(fs.readFileSync(resolved, "utf8")) };
}

function executableTargets(residualPlan = {}) {
  const map = new Map();
  for (const site of residualPlan.sites || []) {
    for (const page of site.executablePages || []) {
      const key = `${site.siteSlug}:${page.pageSlug}`;
      if (!map.has(key)) map.set(key, { siteSlug: site.siteSlug, agencyId: site.agencyId, pageSlug: page.pageSlug });
    }
  }
  return [...map.values()].sort((a, b) => `${a.siteSlug}:${a.pageSlug}`.localeCompare(`${b.siteSlug}:${b.pageSlug}`, "fr"));
}

async function fetchCurrentPages(residualPlan, { backendOrigin, tenantSlug, request = jsonRequest } = {}) {
  const origin = normalizeOrigin(backendOrigin);
  const tenant = String(tenantSlug || "mondescale").trim();
  const rows = [];
  for (const target of executableTargets(residualPlan)) {
    const page = await request(`${origin}/agencies/${encodeURIComponent(target.agencyId)}/site/pages/${encodeURIComponent(target.pageSlug)}/blocks`, {
      method: "GET",
      headers: { "x-tenant-slug": tenant },
    });
    rows.push({ agencyId: target.agencyId, siteSlug: target.siteSlug, page });
  }
  return rows;
}

function defaultOutputPath(residualPath, result) {
  return path.join(path.dirname(path.resolve(residualPath)), `mse-25-40-write-intent-${result.writeIntentFingerprint.slice(0, 12)}.json`);
}

async function run({ residualPlanPath, backendOrigin, tenantSlug, output, emitOutput = true, request = jsonRequest } = {}) {
  const residualSource = residualPlanPath || process.env.MSE_25_40_RESIDUAL_PLAN;
  const { file: residualFile, value: residualPlan } = loadJson(residualSource, "MSE_25_40_WRITE_INTENT_RESIDUAL_REQUIRED");
  if (residualPlan.readOnly !== true || residualPlan.writes !== false || residualPlan.policy?.noHomeScoreFilling !== true || residualPlan.policy?.automaticWrites !== false) {
    const error = new Error("Plan résiduel MSE-25.40 non sûr.");
    error.code = "MSE_25_40_WRITE_INTENT_RESIDUAL_UNSAFE";
    throw error;
  }

  const effectiveOrigin = backendOrigin || process.env.BACKEND_ORIGIN || "http://127.0.0.1:3001";
  const effectiveTenant = tenantSlug || process.env.TENANT_SLUG || "mondescale";
  const currentPages = await fetchCurrentPages(residualPlan, { backendOrigin: effectiveOrigin, tenantSlug: effectiveTenant, request });
  const result = buildResidualWriteIntent({ residualPlan, currentPages });
  const target = path.resolve(output || process.env.MSE_25_40_WRITE_INTENT_OUTPUT || defaultOutputPath(residualFile, result));
  fs.writeFileSync(target, JSON.stringify(result, null, 2) + "\n", "utf8");

  const summary = {
    ok: true,
    readOnly: true,
    writes: false,
    publicWrites: false,
    persistenceCallsPerformed: 0,
    residualExecutionFingerprint: result.residualExecutionFingerprint,
    writeIntentFingerprint: result.writeIntentFingerprint,
    touchedPageCount: result.summary.touchedPageCount,
    snapshotCount: result.summary.snapshotCount,
    writeIntentPath: target,
  };
  if (emitOutput) console.log(JSON.stringify(summary, null, 2));
  return { ...summary, result };
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      readOnly: true,
      writes: false,
      publicWrites: false,
      error: error.code || "MSE_25_40_WRITE_INTENT_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = { defaultOutputPath, executableTargets, fetchCurrentPages, loadJson, run };
