"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function readJson(file) {
  if (!file || !fs.existsSync(file)) throw new Error(`MSE_25_55_SOURCE_REPORT_MISSING:${file || "null"}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function discoverLatestHumanDecision(reportDir) {
  if (!reportDir || !fs.existsSync(reportDir)) return null;
  const files = fs.readdirSync(reportDir)
    .filter((name) => /^mse-25-54-human-decision-[a-f0-9]+\.json$/.test(name))
    .map((name) => path.join(reportDir, name))
    .map((file) => ({ file, mtimeMs: fs.statSync(file).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs || a.file.localeCompare(b.file));
  return files[0]?.file || null;
}

function evaluateEditorialMandateReadiness({ decisionReport = null, decisionReportPath = null } = {}) {
  if (!decisionReport) {
    const result = {
      type: "MSE_25_55_EDITORIAL_MANDATE_READINESS",
      ready: false,
      state: "WAITING_FOR_HUMAN_REFINE_DECISION",
      reason: "NO_MSE_25_54_HUMAN_DECISION_AVAILABLE",
      readOnly: true,
      writes: false,
      publicWrites: false,
      executableCount: 0,
      automaticWriteCount: 0,
      sourceDecisionReportPath: decisionReportPath,
      policy: {
        noSyntheticHumanDecision: true,
        refineDecisionRequired: true,
        automaticMandateCreation: false,
      },
    };
    result.readinessFingerprint = fingerprint(result);
    return result;
  }

  const safe = decisionReport.type === "MSE_25_54_HUMAN_SEO_REVIEW_DECISION_REPORT"
    && decisionReport.certified === true
    && decisionReport.readOnly === true
    && decisionReport.writes === false
    && decisionReport.publicWrites === false
    && Number(decisionReport.summary?.executableCount || 0) === 0
    && Number(decisionReport.summary?.automaticWriteCount || 0) === 0;
  if (!safe) throw new Error("MSE_25_55_UNSAFE_HUMAN_DECISION_REPORT");

  const decision = decisionReport.decision;
  const eligible = decision?.humanDecision === true
    && decision?.decision === "REFINE_EXISTING_PAGE"
    && decision?.nextStep === "PREPARE_NON_EXECUTABLE_EDITORIAL_MANDATE"
    && decision?.reviewOnly === true
    && decision?.executable === false
    && decision?.automaticWrite === false;

  const result = {
    type: "MSE_25_55_EDITORIAL_MANDATE_READINESS",
    ready: eligible,
    state: eligible ? "HUMAN_REFINE_DECISION_AVAILABLE" : "WAITING_FOR_HUMAN_REFINE_DECISION",
    reason: eligible ? "CERTIFIED_REFINE_DECISION_AVAILABLE" : `DECISION_NOT_ELIGIBLE:${decision?.decision || "null"}`,
    readOnly: true,
    writes: false,
    publicWrites: false,
    executableCount: 0,
    automaticWriteCount: 0,
    sourceDecisionReportPath: decisionReportPath,
    sourceDecisionFingerprint: decision?.decisionFingerprint || null,
    policy: {
      noSyntheticHumanDecision: true,
      refineDecisionRequired: true,
      automaticMandateCreation: false,
    },
  };
  result.readinessFingerprint = fingerprint(result);
  return result;
}

module.exports = { discoverLatestHumanDecision, evaluateEditorialMandateReadiness, readJson, fingerprint };
