"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildConsolidatedExecutionPlan } = require("../src/modules/minisite-semantic-engine/consolidated-execution-plan");

function loadJson(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function latestPreflight(directory) {
  return fs.readdirSync(directory)
    .filter((name) => /^mse-25-40-preflight-.*\.json$/.test(name))
    .map((name) => ({ name, mtime: fs.statSync(path.join(directory, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]?.name || null;
}

function validatePreflight(preflight = {}) {
  if (preflight.readOnly !== true || preflight.writes !== false || preflight.destructive !== false) {
    const error = new Error("Preflight MSE-25.40 non sûr.");
    error.code = "MSE_25_40_CONSOLIDATED_UNSAFE_PREFLIGHT";
    throw error;
  }
  if (
    preflight.safety?.verified !== true
    || preflight.safety?.automaticWrites !== false
    || preflight.safety?.managedRoutesAware !== true
  ) {
    const error = new Error("Les garde-fous du preflight MSE-25.40 ne sont pas certifiés, y compris la prise en compte des routes gérées.");
    error.code = "MSE_25_40_CONSOLIDATED_SAFETY_NOT_VERIFIED";
    throw error;
  }
  if (!preflight.preview?.planFingerprint || preflight.preview?.policy?.managedRoutesAware !== true) {
    const error = new Error("Le preflight ne contient pas un preview réseau managed-route-aware exploitable.");
    error.code = "MSE_25_40_CONSOLIDATED_PREVIEW_MISSING";
    throw error;
  }
  return preflight;
}

function run({ preflightPath, output, emitOutput = true } = {}) {
  const directory = path.resolve(process.env.MSE_25_40_REPORT_DIR || path.join(os.homedir(), "mse-25-40-reports"));
  const selected = preflightPath || process.env.MSE_25_40_PREFLIGHT_REPORT || (() => {
    const name = latestPreflight(directory);
    return name ? path.join(directory, name) : null;
  })();
  if (!selected) {
    const error = new Error("Rapport preflight MSE-25.40 introuvable.");
    error.code = "MSE_25_40_PREFLIGHT_REQUIRED";
    throw error;
  }

  const preflight = validatePreflight(loadJson(selected));
  const plan = buildConsolidatedExecutionPlan(preflight.preview);
  const target = path.resolve(output || process.env.MSE_25_40_CONSOLIDATED_OUTPUT || path.join(directory, `mse-25-40-consolidated-${plan.executionFingerprint.slice(0, 12)}.json`));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(plan, null, 2) + "\n", "utf8");

  const result = {
    ok: true,
    readOnly: true,
    writes: false,
    reportPath: target,
    executionFingerprint: plan.executionFingerprint,
    sourcePlanFingerprint: plan.sourcePlanFingerprint,
    summary: plan.summary,
    policy: plan.policy,
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  try { run(); }
  catch (error) {
    console.error(JSON.stringify({ ok: false, error: error.code || "MSE_25_40_CONSOLIDATED_FAILED", message: error.message }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { latestPreflight, loadJson, run, validatePreflight };
