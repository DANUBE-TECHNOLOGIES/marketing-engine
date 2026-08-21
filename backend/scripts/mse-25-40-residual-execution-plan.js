"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { buildResidualExecutionPlan } = require("../src/modules/minisite-semantic-engine/residual-execution-plan");

function loadJson(file, code) {
  if (!file) {
    const error = new Error("Rapport MSE-25.40 requis.");
    error.code = code;
    throw error;
  }
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function latest(directory, pattern) {
  return fs.readdirSync(directory)
    .filter((name) => pattern.test(name))
    .map((name) => ({ name, mtime: fs.statSync(path.join(directory, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)[0]?.name || null;
}

function run({ preflightPath, consolidatedPath, output, emitOutput = true } = {}) {
  const directory = path.resolve(process.env.MSE_25_40_REPORT_DIR || path.join(os.homedir(), "mse-25-40-reports"));
  const preflightSource = preflightPath || process.env.MSE_25_40_PREFLIGHT_REPORT || (() => {
    const name = latest(directory, /^mse-25-40-preflight-.*\.json$/);
    return name ? path.join(directory, name) : null;
  })();
  const consolidatedSource = consolidatedPath || process.env.MSE_25_40_CONSOLIDATED_PLAN || (() => {
    const name = latest(directory, /^mse-25-40-consolidated-.*\.json$/);
    return name ? path.join(directory, name) : null;
  })();

  const preflight = loadJson(preflightSource, "MSE_25_40_RESIDUAL_PREFLIGHT_REQUIRED");
  const consolidated = loadJson(consolidatedSource, "MSE_25_40_RESIDUAL_CONSOLIDATED_REQUIRED");

  if (preflight.readOnly !== true || preflight.writes !== false || preflight.safety?.verified !== true || preflight.safety?.automaticWrites !== false) {
    const error = new Error("Preflight MSE-25.40 non certifié pour l'analyse résiduelle.");
    error.code = "MSE_25_40_RESIDUAL_UNSAFE_PREFLIGHT";
    throw error;
  }
  if (!preflight.preview?.planFingerprint) {
    const error = new Error("Preview réseau absent du preflight MSE-25.40.");
    error.code = "MSE_25_40_RESIDUAL_PREVIEW_MISSING";
    throw error;
  }

  const plan = buildResidualExecutionPlan(preflight.preview, consolidated);
  const target = path.resolve(output || process.env.MSE_25_40_RESIDUAL_OUTPUT || path.join(directory, `mse-25-40-residual-${plan.residualExecutionFingerprint.slice(0, 12)}.json`));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(plan, null, 2) + "\n", "utf8");

  const result = {
    ok: true,
    readOnly: true,
    writes: false,
    reportPath: target,
    sourcePlanFingerprint: plan.sourcePlanFingerprint,
    consolidatedExecutionFingerprint: plan.consolidatedExecutionFingerprint,
    residualExecutionFingerprint: plan.residualExecutionFingerprint,
    executable: plan.executable,
    summary: plan.summary,
    policy: plan.policy,
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
      readOnly: true,
      writes: false,
      error: error.code || "MSE_25_40_RESIDUAL_FAILED",
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { latest, loadJson, run };
