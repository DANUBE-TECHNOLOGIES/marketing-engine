#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { buildSearchDemandHistory } = require("../src/modules/minisite-semantic-engine/search-demand-history");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function discoverObservations(reportDir) {
  if (!fs.existsSync(reportDir)) return [];
  return fs.readdirSync(reportDir)
    .filter((name) => /^mse-25-49-observation-[a-f0-9]+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .map((file) => ({ file, value: readJson(file) }));
}

function run({ reportDir = process.env.MSE_25_50_REPORT_DIR || process.env.MSE_25_49_REPORT_DIR || "/tmp", emitOutput = true } = {}) {
  fs.mkdirSync(reportDir, { recursive: true });
  const discovered = discoverObservations(reportDir);
  const history = buildSearchDemandHistory({ observations: discovered.map((item) => item.value) });
  const reportPath = path.join(reportDir, `mse-25-50-search-demand-history-${history.historyFingerprint.slice(0, 12)}.json`);
  const report = {
    ...history,
    generatedAt: new Date().toISOString(),
    sourceObservationFiles: discovered.map((item) => item.file),
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  const output = {
    ok: true,
    readOnly: true,
    writes: false,
    reportPath,
    historyFingerprint: history.historyFingerprint,
    snapshotCount: history.snapshotCount,
    latest: history.latest,
    change: history.change,
  };
  if (emitOutput) console.log(JSON.stringify(output, null, 2));
  return { ...output, history: report };
}

if (require.main === module) {
  try { run(); }
  catch (error) {
    console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: "MSE_25_50_HISTORY_FAILED", message: error.message }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = { run, discoverObservations };
