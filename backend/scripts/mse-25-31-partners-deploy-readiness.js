"use strict";

const { execFileSync } = require("node:child_process");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_WORKFLOW_PATH,
} = require("./mse-25-31-ci-attestation");
const { EXPECTED_BRANCH } = require("./mse-25-31-preflight");

const REQUIRED_MODULES = Object.freeze([
  "../src/modules/agency-site/partner-page-rollout",
  "../src/modules/agency-site/partner-page-migration",
  "../src/modules/agency-site/page-builder-save",
  "../src/modules/agency-site/page-versions",
  "../src/modules/agency-site/routes",
  "../src/modules/agency-site/service",
]);

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function repositoryState() {
  return {
    branch: git(["branch", "--show-current"]),
    head: git(["rev-parse", "HEAD"]),
    dirty: Boolean(git(["status", "--porcelain"])),
    workflowBlobSha: git(["rev-parse", `HEAD:${GITHUB_WORKFLOW_PATH}`]).toLowerCase(),
  };
}

function assertRepositoryReady(state = repositoryState()) {
  if (state.branch !== EXPECTED_BRANCH) {
    const error = new Error(`Branche inattendue : ${state.branch || "(detached)"}. Attendu : ${EXPECTED_BRANCH}.`);
    error.code = "PARTNER_DEPLOY_BRANCH_MISMATCH";
    throw error;
  }
  if (state.dirty) {
    const error = new Error("Le working tree doit être propre avant injection MSE-25.31 Partenaires.");
    error.code = "PARTNER_DEPLOY_DIRTY_WORKTREE";
    throw error;
  }
  if (state.workflowBlobSha !== EXPECTED_WORKFLOW_BLOB_SHA) {
    const error = new Error("Le workflow CI présent sur la VM ne correspond pas à la définition attestée.");
    error.code = "PARTNER_DEPLOY_WORKFLOW_MISMATCH";
    error.details = { actual: state.workflowBlobSha, expected: EXPECTED_WORKFLOW_BLOB_SHA };
    throw error;
  }
  return state;
}

function assertModulesLoad(loader = require) {
  const contracts = [];
  for (const modulePath of REQUIRED_MODULES) {
    const loaded = loader(modulePath);
    if (!loaded) {
      const error = new Error(`Module Partenaires impossible à charger : ${modulePath}`);
      error.code = "PARTNER_DEPLOY_MODULE_LOAD_FAILED";
      throw error;
    }
    contracts.push(modulePath);
  }

  const rollout = loader("../src/modules/agency-site/partner-page-rollout");
  const migration = loader("../src/modules/agency-site/partner-page-migration");
  const save = loader("../src/modules/agency-site/page-builder-save");
  const versions = loader("../src/modules/agency-site/page-versions");
  const requiredFunctions = [
    ["partnerPageReadiness", rollout.partnerPageReadiness],
    ["ensureNetworkPartnerPages", rollout.ensureNetworkPartnerPages],
    ["previewPartnerPageMigration", migration.previewPartnerPageMigration],
    ["applyPartnerPageMigration", migration.applyPartnerPageMigration],
    ["assertPartnerPagePublishable", save.assertPartnerPagePublishable],
    ["saveDesignerPage", save.saveDesignerPage],
    ["listPageVersions", versions.listPageVersions],
    ["rollbackPageVersion", versions.rollbackPageVersion],
  ];
  const missing = requiredFunctions.filter(([, value]) => typeof value !== "function").map(([name]) => name);
  if (missing.length) {
    const error = new Error(`Contrats Partenaires manquants : ${missing.join(", ")}`);
    error.code = "PARTNER_DEPLOY_CONTRACT_MISSING";
    error.details = { missing };
    throw error;
  }
  return { loaded: contracts, contracts: requiredFunctions.map(([name]) => name) };
}

function run({ emitOutput = true } = {}) {
  const repository = assertRepositoryReady();
  const modules = assertModulesLoad();
  const result = {
    ok: true,
    readyForVmInjection: true,
    publicWritesPerformed: false,
    repository,
    workflow: {
      path: GITHUB_WORKFLOW_PATH,
      blobSha: EXPECTED_WORKFLOW_BLOB_SHA,
    },
    modules,
    next: [
      "backend MSE-25.31 tests",
      "frontend partner preflight",
      "frontend production build",
      "service restart",
      "read-only partner migration preview",
    ],
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
      readyForVmInjection: false,
      publicWritesPerformed: false,
      error: error.code || "PARTNER_DEPLOY_READINESS_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  }
}

module.exports = {
  REQUIRED_MODULES,
  assertModulesLoad,
  assertRepositoryReady,
  repositoryState,
  run,
};
