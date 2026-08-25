#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { run: runLifecycle } = require("./mse-25-49-search-demand-lifecycle");

function certifyLifecycle(lifecycle = {}) {
  const safe = lifecycle.readOnly === true
    && lifecycle.writes === false
    && lifecycle.policy?.automaticWrites === false
    && lifecycle.policy?.noAutomaticPageCreation === true
    && lifecycle.policy?.noAutomaticContentWrite === true
    && lifecycle.policy?.noAutomaticPublication === true
    && lifecycle.policy?.noDemandInferenceFromMissingData === true
    && Number(lifecycle.summary?.automaticWriteCount || 0) === 0;

  const waiting = lifecycle.lifecycleState === "WAITING_FOR_SEARCH_DEMAND_DATA";
  const active = lifecycle.lifecycleState === "SEARCH_DEMAND_LIFECYCLE_ACTIVE";
  const noDataSemanticsSafe = waiting
    ? lifecycle.noDataIsNotNoDemand === true
      && Number(lifecycle.summary?.humanReviewEligibleCount || 0) === 0
    : true;

  const reviewGateSafe = active
    ? lifecycle.policy?.persistentDemandRequiredBeforeHumanReview === true
      && Number(lifecycle.policy?.minimumConsecutiveQualifyingSnapshots || 0) >= 2
      && lifecycle.policy?.singleSnapshotSpikeIsInsufficient === true
    : true;

  const certified = safe && (waiting || active) && noDataSemanticsSafe && reviewGateSafe;
  return {
    certified,
    safe,
    waitingForData: waiting,
    lifecycleActive: active,
    noDataSemanticsSafe,
    reviewGateSafe,
  };
}

async function run({ lifecycle = null } = {}) {
  let source = lifecycle;
  let sourcePath = null;
  if (!source) {
    const result = await runLifecycle();
    source = result.lifecycle;
    sourcePath = result.reportPath;
  }

  const certification = certifyLifecycle(source);
  const reportDir = process.env.MSE_25_49_REPORT_DIR || process.env.MSE_25_48_REPORT_DIR || "/tmp";
  fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    type: "mse-25.49-lifecycle-certification",
    sourceLifecycleFingerprint: source.lifecycleFingerprint || null,
    sourcePath,
    readOnly: true,
    writes: false,
    certification,
    lifecycleState: source.lifecycleState,
    dataState: source.dataState,
    summary: source.summary,
  };
  const suffix = String(source.lifecycleFingerprint || "unknown").slice(0, 12);
  const reportPath = path.join(reportDir, `mse-25-49-certification-${suffix}.json`);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });

  const output = {
    ok: certification.certified,
    readOnly: true,
    writes: false,
    reportPath,
    lifecycleState: source.lifecycleState,
    dataState: source.dataState,
    certification,
    summary: source.summary,
  };
  console.log(JSON.stringify(output, null, 2));
  if (!certification.certified) {
    const error = new Error("MSE-25.49 lifecycle certification failed.");
    error.code = "MSE_25_49_CERTIFICATION_FAILED";
    error.details = output;
    throw error;
  }
  return output;
}

if (require.main === module) run().catch((error) => {
  if (error?.details) process.exitCode = 1;
  else {
    console.error(JSON.stringify({ ok: false, readOnly: true, writes: false, error: error.code || "MSE_25_49_CERTIFICATION_FAILED", message: error.message }, null, 2));
    process.exitCode = 1;
  }
});

module.exports = { certifyLifecycle, run };
