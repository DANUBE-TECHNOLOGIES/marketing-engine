"use strict";

const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { run: operationalStatus } = require("./mse-25-operational-status");

const SAFE_NEXT_ACTIONS = new Set([
  "WAIT_FOR_SEARCH_CONSOLE_DATA",
  "CONTINUE_READ_ONLY_OBSERVATION",
  "HUMAN_REVIEW_REQUIRED",
  "BUILD_EDITORIAL_MANDATE",
  "BUILD_EDITORIAL_DIFF_PREVIEW",
  "HUMAN_DIFF_APPROVAL_REQUIRED",
  "BUILD_VERSIONED_WRITE_INTENT",
  "RUN_OPTIMISTIC_VERSION_CHECK",
  "HUMAN_EXECUTION_AUTHORIZATION_REQUIRED",
  "BUILD_EXPLICIT_EXECUTION_PLAN",
  "FINAL_HUMAN_APPLY_CONFIRMATION_REQUIRED",
  "RUN_PRE_APPLY_VERSION_ROLLBACK_GATE",
  "GUARDED_APPLY_REQUIRES_EXPLICIT_TOKEN",
  "VERIFY_POST_APPLY",
  "POST_APPLY_VERIFIED",
  "BUILD_ROLLBACK_INTENT",
  "HUMAN_ROLLBACK_AUTHORIZATION_REQUIRED",
  "GUARDED_ROLLBACK_REQUIRES_EXPLICIT_TOKEN",
  "VERIFY_POST_ROLLBACK",
  "INCIDENT_RECOVERY_VERIFIED",
  "MANUAL_INCIDENT_INTERVENTION_REQUIRED",
  "MANUAL_SAFETY_REVIEW_REQUIRED",
]);

function invariant(condition, message, details) {
  if (condition) return;
  const error = new Error(message);
  error.details = details;
  throw error;
}

function certifyOperationalStatus(status) {
  invariant(status?.ok === true, "Operational status did not complete successfully", status);
  invariant(status?.certified === true, "Operational status is not certified", status);
  invariant(status?.readOnly === true, "Operational status must remain read-only", status);
  invariant(status?.writes === false, "Operational status reports writes", status);
  invariant(status?.publicWrites === false, "Operational status reports public writes", status);

  const safety = status?.safety || {};
  for (const key of [
    "executableCount",
    "automaticWriteCount",
    "pageCreationCount",
    "publicationCount",
    "websiteDesignerMutationCount",
  ]) {
    invariant(Number(safety[key] || 0) === 0, `Unsafe operational safety counter: ${key}`, safety);
  }

  invariant(
    Number(status?.downstream?.summary?.unsafeCount || 0) === 0,
    "Unsafe downstream stage detected",
    status?.downstream?.summary
  );
  invariant(
    status?.humanGate?.automaticDecision === false,
    "Human gate must never make an automatic decision",
    status?.humanGate
  );
  invariant(
    SAFE_NEXT_ACTIONS.has(status?.nextAction),
    "Unknown operational next action",
    status?.nextAction
  );

  return {
    certified: true,
    readOnly: true,
    writes: false,
    publicWrites: false,
    searchDataState: status?.searchConsole?.dataState || "UNKNOWN",
    lifecycleState: status?.searchConsole?.lifecycleState || null,
    nextAction: status.nextAction,
    humanGateRequired: status?.humanGate?.required === true,
    reportPath: status?.reportPath || null,
    safety,
  };
}

function runProductionGate82() {
  const script = path.join(__dirname, "mse-25-82-read-only-production-gate.js");
  const result = spawnSync(process.execPath, [script], {
    env: process.env,
    stdio: "inherit",
  });
  invariant(result.error == null, "Unable to execute MSE-25.82 production gate", result.error?.message);
  invariant(result.status === 0, "MSE-25.82 production gate failed", { status: result.status, signal: result.signal });
}

async function main() {
  runProductionGate82();

  const status = await operationalStatus({ emitOutput: false });
  const certification = certifyOperationalStatus(status);

  console.log("================================================");
  console.log("=== MSE-25.83 - OPERATIONAL CERTIFICATION =====");
  console.log("================================================");
  console.log("MSE-25.82=PASS");
  console.log("OPERATIONAL_STATUS=CERTIFIED");
  console.log(`SEARCH_DATA_STATE=${certification.searchDataState}`);
  console.log(`LIFECYCLE_STATE=${certification.lifecycleState || "NONE"}`);
  console.log(`NEXT_ACTION=${certification.nextAction}`);
  console.log(`HUMAN_GATE_REQUIRED=${certification.humanGateRequired ? "YES" : "NO"}`);
  console.log("AUTOMATIC_DECISION=NO");
  console.log("AUTOMATIC_WRITES=0");
  console.log("PUBLIC_WRITES=0");
  console.log("PAGE_CREATION=0");
  console.log("PUBLICATION_MUTATION=0");
  console.log("WEBSITE_DESIGNER_MUTATION=0");
  console.log("GOOGLE_WRITES=0");
  console.log(`REPORT=${certification.reportPath || "NONE"}`);
  console.log("MSE-25.83=PASS");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("================================================");
    console.error("=== MSE-25.83 - FAIL ==========================");
    console.error("================================================");
    console.error(error?.message || error);
    if (error?.details !== undefined) {
      console.error(
        typeof error.details === "string"
          ? error.details
          : JSON.stringify(error.details, null, 2)
      );
    }
    process.exitCode = 1;
  });
}

module.exports = {
  SAFE_NEXT_ACTIONS,
  certifyOperationalStatus,
  runProductionGate82,
};
