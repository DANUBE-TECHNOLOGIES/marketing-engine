"use strict";

const fs = require("node:fs");
const path = require("node:path");

function latestOperationalReport(dir) {
  if (!dir || !fs.existsSync(dir)) return null;
  return fs.readdirSync(dir)
    .filter((name) => name.startsWith("mse-25-operational-status-") && name.endsWith(".json"))
    .map((name) => {
      const file = path.join(dir, name);
      return { file, mtimeMs: fs.statSync(file).mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.file || null;
}

function buildOperationalRuntimeStatus({ env = process.env } = {}) {
  const reportDir = env.MSE_25_OPERATIONAL_REPORT_DIR || "/home/admin1/mse-25-operational-reports";
  const reportPath = env.MSE_25_OPERATIONAL_STATUS_REPORT || latestOperationalReport(reportDir);
  if (!reportPath) {
    return {
      ok: true,
      type: "MSE_25_OPERATIONAL_RUNTIME_STATUS",
      status: "waiting",
      state: "WAITING_FOR_OPERATIONAL_OBSERVATION",
      reason: "NO_CERTIFIED_OPERATIONAL_REPORT_AVAILABLE",
      reportPath: null,
      readOnly: true,
      writes: false,
      publicWrites: false,
      nextAction: "RUN_READ_ONLY_OPERATIONAL_OBSERVATION",
      safety: { executableCount: 0, automaticWriteCount: 0, pageCreationCount: 0, publicationCount: 0, websiteDesignerMutationCount: 0 },
    };
  }

  let report;
  try { report = JSON.parse(fs.readFileSync(reportPath, "utf8")); }
  catch (error) {
    return {
      ok: false,
      type: "MSE_25_OPERATIONAL_RUNTIME_STATUS",
      status: "error",
      state: "OPERATIONAL_REPORT_UNREADABLE",
      reason: error.message,
      reportPath,
      readOnly: true,
      writes: false,
      publicWrites: false,
      safety: { executableCount: 0, automaticWriteCount: 0, pageCreationCount: 0, publicationCount: 0, websiteDesignerMutationCount: 0 },
    };
  }

  const certified = report?.type === "MSE_25_OPERATIONAL_SEO_DEMAND_STATUS" &&
    report?.certified === true && report?.readOnly === true &&
    report?.writes === false && report?.publicWrites === false &&
    Number(report?.safety?.automaticWriteCount || 0) === 0 &&
    Number(report?.safety?.websiteDesignerMutationCount || 0) === 0;

  if (!certified) {
    return {
      ok: false,
      type: "MSE_25_OPERATIONAL_RUNTIME_STATUS",
      status: "error",
      state: "OPERATIONAL_REPORT_UNSAFE",
      reason: "LATEST_OPERATIONAL_REPORT_FAILED_READ_ONLY_CERTIFICATION",
      reportPath,
      readOnly: true,
      writes: false,
      publicWrites: false,
      safety: { executableCount: 0, automaticWriteCount: 0, pageCreationCount: 0, publicationCount: 0, websiteDesignerMutationCount: 0 },
    };
  }

  return {
    ok: true,
    type: "MSE_25_OPERATIONAL_RUNTIME_STATUS",
    status: report?.humanGate?.required ? "attention" : "healthy",
    state: report?.searchConsole?.lifecycleState || "UNKNOWN",
    reason: report?.nextAction || "CONTINUE_READ_ONLY_OBSERVATION",
    reportPath,
    generatedAt: report.generatedAt || null,
    readOnly: true,
    writes: false,
    publicWrites: false,
    runtimeEnv: report.runtimeEnv || null,
    searchConsole: report.searchConsole || null,
    pipeline: report.pipeline || {},
    downstream: report.downstream || {},
    humanGate: report.humanGate || { required: false, automaticDecision: false },
    incidents: report.incidents || {},
    safety: report.safety || {},
    nextAction: report.nextAction || null,
    statusFingerprint: report.statusFingerprint || null,
  };
}

module.exports = { buildOperationalRuntimeStatus, latestOperationalReport };
