"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {
  EXPECTED_BRANCH,
  assertRepositoryState,
  assertWorkflowDefinition,
  repositoryState,
} = require("./mse-25-31-preflight");
const {
  assertAttestation,
  attestHead,
} = require("./mse-25-31-ci-attestation");
const {
  normalizeOrigin,
  run: runNetworkPreview,
} = require("./mse-25-31-network-preview");

const REQUIRED_SCRIPTS = [
  "mse-25.31:vm-readiness",
  "mse-25.31:network-preview",
  "mse-25.31:preflight",
  "mse-25.31:preflight-check",
  "mse-25.31:approval-manifest",
  "mse-25.31:approval-check",
  "mse-25.31:execution-plan",
  "mse-25.31:execution-plan-check",
  "mse-25.31:apply-gate",
  "mse-25.31:write-intent",
  "mse-25.31:write-intent-check",
  "mse-25.31:network-apply",
  "mse-25.31:rollout-report-check",
  "mse-25.31:network-rollback",
  "mse-25.31:post-rollout-validate",
];

const REQUIRED_MODULES = [
  "../src/modules/minisite-seo-enrichment/quality-uplift-preview-patch",
  "../src/modules/minisite-seo-enrichment/quality-uplift-planner",
  "../src/modules/minisite-seo-enrichment/quality-uplift-action-planner",
  "../src/modules/minisite-seo-enrichment/quality-uplift-proposal-planner",
  "../src/modules/minisite-seo-enrichment/quality-uplift-impact-preview",
  "../src/modules/minisite-seo-enrichment/quality-uplift-operator-report",
  "../src/modules/minisite-seo-enrichment/quality-uplift-executor",
];

function readPackageJson(packagePath = path.join(__dirname, "..", "package.json")) {
  return JSON.parse(fs.readFileSync(packagePath, "utf8"));
}

function readRouteSources() {
  const base = path.join(__dirname, "..", "src", "modules");
  return [
    path.join(base, "minisite-seo-enrichment", "routes.js"),
    path.join(base, "minisite-seo-quality-uplift", "routes.js"),
  ].map((file) => fs.readFileSync(file, "utf8")).join("\n");
}

function assertRequiredScripts(pkg = {}) {
  const scripts = pkg.scripts || {};
  const missing = REQUIRED_SCRIPTS.filter((name) => !String(scripts[name] || "").trim());
  if (missing.length) {
    const error = new Error("Des commandes opérateur MSE-25.31 sont absentes du backend.");
    error.code = "MSE_25_31_VM_REQUIRED_SCRIPTS_MISSING";
    error.details = { missing };
    throw error;
  }
  return { ok: true, requiredScriptCount: REQUIRED_SCRIPTS.length };
}

function assertRouteSafety(routesSource) {
  const source = String(routesSource || "");
  const required = [
    "/minisite-seo-enrichment/agencies/:agencyId/quality-uplift/preview",
    "/minisite-seo-enrichment/network/quality-uplift/preview",
    "/minisite-seo-quality-uplift/health",
    "/minisite-seo-quality-uplift/agencies/:agencyId/preview",
    "/minisite-seo-quality-uplift/network/preview",
  ];
  const forbidden = [
    "/minisite-seo-enrichment/agencies/:agencyId/quality-uplift/apply",
    "/minisite-seo-enrichment/network/quality-uplift/apply",
    "/minisite-seo-quality-uplift/agencies/:agencyId/apply",
    "/minisite-seo-quality-uplift/network/apply",
  ];
  const issues = [];
  for (const route of required) {
    if (!source.includes(route)) issues.push({ code: "required-preview-route-missing", route });
  }
  for (const route of forbidden) {
    if (source.includes(route)) issues.push({ code: "forbidden-http-apply-route", route });
  }
  if (issues.length) {
    const error = new Error("Le contrat HTTP MSE-25.31 n'est pas conforme au périmètre preview-only approuvé.");
    error.code = "MSE_25_31_VM_ROUTE_SAFETY_INVALID";
    error.details = { issues };
    throw error;
  }
  return { ok: true, previewRoutes: required, forbiddenApplyRoutesPresent: false };
}

function assertModulesLoad(moduleLoader = require) {
  const loaded = [];
  for (const modulePath of REQUIRED_MODULES) {
    const value = moduleLoader(modulePath);
    if (!value || (typeof value !== "object" && typeof value !== "function")) {
      const error = new Error(`Le module MSE-25.31 ${modulePath} ne se charge pas correctement.`);
      error.code = "MSE_25_31_VM_MODULE_LOAD_FAILED";
      error.details = { modulePath };
      throw error;
    }
    loaded.push(modulePath);
  }
  return { ok: true, loadedModuleCount: loaded.length, modules: loaded };
}

function assertSafeRuntimePreview(preview = {}) {
  if (preview.readOnly !== true || preview.writes !== false || preview.destructive !== false) {
    const error = new Error("Le preview runtime MSE-25.31 n'est pas strictement read-only.");
    error.code = "MSE_25_31_VM_UNSAFE_RUNTIME_PREVIEW";
    error.details = {
      readOnly: preview.readOnly,
      writes: preview.writes,
      destructive: preview.destructive,
    };
    throw error;
  }
  if (!/^[0-9a-f]{64}$/i.test(String(preview.planFingerprint || ""))) {
    const error = new Error("Le preview runtime MSE-25.31 ne fournit pas un fingerprint SHA-256 valide.");
    error.code = "MSE_25_31_VM_RUNTIME_FINGERPRINT_INVALID";
    throw error;
  }
  return preview;
}

async function run({
  backendOrigin,
  tenantSlug,
  minimumWords = 120,
  emitOutput = true,
  repositoryReader = repositoryState,
  ciAttestor = attestHead,
  previewRunner = runNetworkPreview,
  packageReader = readPackageJson,
  routesReader = readRouteSources,
  moduleLoader = require,
} = {}) {
  const repository = assertRepositoryState(repositoryReader(), { expectedBranch: EXPECTED_BRANCH, allowDirty: false });
  assertWorkflowDefinition(repository);
  const scripts = assertRequiredScripts(packageReader());
  const routes = assertRouteSafety(routesReader());
  const modules = assertModulesLoad(moduleLoader);
  const ciAttestation = assertAttestation(
    await ciAttestor(repository.head, { expectedBranch: EXPECTED_BRANCH }),
    { head: repository.head, branch: EXPECTED_BRANCH }
  );

  const origin = normalizeOrigin(backendOrigin || process.env.BACKEND_ORIGIN);
  const tenant = String(tenantSlug || process.env.TENANT_SLUG || "mondescale").trim();
  const preview = assertSafeRuntimePreview(await previewRunner({
    backendOrigin: origin,
    tenantSlug: tenant,
    minimumWords,
    topPages: 10,
    includeAllPages: false,
    emitOutput: false,
  }));

  const result = {
    ok: true,
    readyForPreflight: true,
    publicWritesEnabled: false,
    repository,
    ciAttestation,
    runtime: {
      backendOrigin: origin,
      tenantSlug: tenant,
      minimumWords: Number(minimumWords || 120),
      planFingerprint: preview.planFingerprint,
      summary: preview.summary || {},
      excludedSites: preview.excludedSites || [],
    },
    checks: { scripts, routes, modules },
  };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  return result;
}

if (require.main === module) {
  run().catch((error) => {
    console.error(JSON.stringify({
      ok: false,
      readyForPreflight: false,
      publicWritesEnabled: false,
      error: error.code || "MSE_25_31_VM_READINESS_FAILED",
      message: error.message,
      details: error.details || {},
    }, null, 2));
    process.exitCode = 1;
  });
}

module.exports = {
  REQUIRED_MODULES,
  REQUIRED_SCRIPTS,
  assertModulesLoad,
  assertRequiredScripts,
  assertRouteSafety,
  assertSafeRuntimePreview,
  readPackageJson,
  readRouteSources,
  run,
};
