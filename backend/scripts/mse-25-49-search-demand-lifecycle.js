#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: buildCurrentEvidence } = require("./mse-25-48-search-demand-evidence");
const { buildSearchDemandLifecycle } = require("../src/modules/minisite-semantic-engine/search-demand-lifecycle");

function loadJson(file) {
  if (!file) return null;
  const resolved = path.resolve(file);
  if (!fs.existsSync(resolved)) return null;
  return JSON.parse(fs.readFileSync(resolved, "utf8"));
}

function findPreviousEvidence(reportDir, currentFingerprint) {
  if (!fs.existsSync(reportDir)) return null;
  const candidates = fs.readdirSync(reportDir)
    .filter((name) => /^mse-25-48-search-demand-evidence-[a-f0-9]+\.json$/.test(name))
    .map((name) => {
      const file = path.join(reportDir, name);
      return { file, mtimeMs: fs.statSync(file).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const candidate of candidates) {
    const snapshot = loadJson(candidate.file);
    if (snapshot?.evidenceFingerprint && snapshot.evidenceFingerprint !== currentFingerprint) {
      return { snapshot, file: candidate.file };
    }
  }
  return null;
}

async function run({ currentEvidence = null, previousEvidence = undefined, emitOutput = true } = {}) {
  let current = currentEvidence;
  if (!current) {
    const evidenceResult = await buildCurrentEvidence({ emitOutput: false });
    current = evidenceResult.report;
  }

  const reportDir = process.env.MSE_25_49_REPORT_DIR || process.env.MSE_25_48_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });

  let previous = previousEvidence;
  let previousEvidenceFile = null;
  if (previous === undefined) {
    const explicit = process.env.MSE_25_49_PREVIOUS_EVIDENCE_FILE;
    if (explicit) {
      previous = loadJson(explicit);
      previousEvidenceFile = previous ? path.resolve(explicit) : null;
    } else {
      const found = findPreviousEvidence(reportDir, current.evidenceFingerprint);
      previous = found?.snapshot || null;
      previousEvidenceFile = found?.file || null;
    }
  }

  const lifecycle = buildSearchDemandLifecycle({ previous: previous || null, current });
  const reportPath = path.join(reportDir, `mse-25-49-search-demand-lifecycle-${lifecycle.lifecycleFingerprint.slice(0, 12)}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(lifecycle, null, 2)}\n`, { mode: 0o600 });

  const result = {
    ok: true,
    readOnly: true,
    writes: false,
    reportPath,
    lifecycleFingerprint: lifecycle.lifecycleFingerprint,
    sourceEvidenceFingerprint: lifecycle.sourceEvidenceFingerprint,
    previousEvidenceFingerprint: lifecycle.previousEvidenceFingerprint,
    previousEvidenceFile,
    dataState: lifecycle.dataState,
    lifecycleState: lifecycle.lifecycleState,
    summary: lifecycle.summary,
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return { lifecycle, ...result };
}

if (require.main === module) run().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    readOnly: true,
    writes: false,
    error: error.code || "MSE_25_49_SEARCH_DEMAND_LIFECYCLE_FAILED",
    message: error.message,
  }, null, 2));
  process.exitCode = 1;
});

module.exports = { loadJson, findPreviousEvidence, run };
