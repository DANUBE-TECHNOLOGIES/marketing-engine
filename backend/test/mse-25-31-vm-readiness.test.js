"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  REQUIRED_MODULES,
  REQUIRED_SCRIPTS,
  assertRequiredScripts,
  assertRouteSafety,
  assertSafeRuntimePreview,
  run,
} = require("../scripts/mse-25-31-vm-readiness");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");
const {
  EXPECTED_WORKFLOW_BLOB_SHA,
  GITHUB_REPOSITORY,
  GITHUB_WORKFLOW_ID,
  GITHUB_WORKFLOW_NAME,
  GITHUB_WORKFLOW_PATH,
} = require("../scripts/mse-25-31-ci-attestation");

const HEAD = "a".repeat(40);
const PLAN = "b".repeat(64);

function ciAttestation() {
  return {
    ok: true,
    repository: GITHUB_REPOSITORY,
    workflowId: GITHUB_WORKFLOW_ID,
    workflowName: GITHUB_WORKFLOW_NAME,
    workflowPath: GITHUB_WORKFLOW_PATH,
    workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
    runId: 12345,
    headSha: HEAD,
    headBranch: EXPECTED_BRANCH,
    event: "push",
    status: "completed",
    conclusion: "success",
  };
}

function repositoryState() {
  return {
    branch: EXPECTED_BRANCH,
    head: HEAD,
    dirty: false,
    workflowPath: GITHUB_WORKFLOW_PATH,
    workflowBlobSha: EXPECTED_WORKFLOW_BLOB_SHA,
  };
}

function packageJson() {
  return {
    scripts: Object.fromEntries(REQUIRED_SCRIPTS.map((name) => [name, `node ${name}.js`])),
  };
}

const SAFE_ROUTES = `
router.post("/minisite-seo-enrichment/agencies/:agencyId/quality-uplift/preview", handler);
router.post("/minisite-seo-enrichment/network/quality-uplift/preview", handler);
router.get("/minisite-seo-quality-uplift/health", handler);
router.post("/minisite-seo-quality-uplift/agencies/:agencyId/preview", handler);
router.post("/minisite-seo-quality-uplift/network/preview", handler);
`;

test("VM readiness accepts clean attested branch and strictly read-only runtime preview", async () => {
  const result = await run({
    backendOrigin: "http://127.0.0.1:4000/",
    tenantSlug: "mondescale",
    repositoryReader: repositoryState,
    ciAttestor: async () => ciAttestation(),
    previewRunner: async () => ({
      readOnly: true,
      writes: false,
      destructive: false,
      planFingerprint: PLAN,
      summary: { agenciesProcessed: 7 },
      excludedSites: [{ siteSlug: "tui-store-melun" }, { siteSlug: "tui-store-amilly" }],
    }),
    packageReader: packageJson,
    routesReader: () => SAFE_ROUTES,
    moduleLoader: () => ({}),
    emitOutput: false,
  });

  assert.equal(result.ok, true);
  assert.equal(result.readyForPreflight, true);
  assert.equal(result.publicWritesEnabled, false);
  assert.equal(result.runtime.backendOrigin, "http://127.0.0.1:4000");
  assert.equal(result.runtime.planFingerprint, PLAN);
  assert.equal(result.ciAttestation.event, "push");
  assert.equal(result.checks.scripts.requiredScriptCount, REQUIRED_SCRIPTS.length);
  assert.equal(result.checks.modules.loadedModuleCount, REQUIRED_MODULES.length);
  assert.equal(result.checks.routes.previewRoutes.length, 5);
});

test("VM readiness refuses missing operator commands", () => {
  assert.throws(
    () => assertRequiredScripts({ scripts: {} }),
    (error) => error.code === "MSE_25_31_VM_REQUIRED_SCRIPTS_MISSING"
  );
});

test("VM readiness refuses missing preview routes or HTTP quality-uplift apply routes", () => {
  assert.throws(
    () => assertRouteSafety(SAFE_ROUTES.replace('/minisite-seo-quality-uplift/health', '/missing-health')),
    (error) => error.code === "MSE_25_31_VM_ROUTE_SAFETY_INVALID"
  );
  assert.throws(
    () => assertRouteSafety(`${SAFE_ROUTES}\nrouter.post("/minisite-seo-enrichment/network/quality-uplift/apply", handler);`),
    (error) => error.code === "MSE_25_31_VM_ROUTE_SAFETY_INVALID"
  );
  assert.throws(
    () => assertRouteSafety(`${SAFE_ROUTES}\nrouter.post("/minisite-seo-quality-uplift/network/apply", handler);`),
    (error) => error.code === "MSE_25_31_VM_ROUTE_SAFETY_INVALID"
  );
});

test("VM readiness refuses unsafe or unfingerprinted runtime previews", () => {
  assert.throws(
    () => assertSafeRuntimePreview({ readOnly: true, writes: true, destructive: false, planFingerprint: PLAN }),
    (error) => error.code === "MSE_25_31_VM_UNSAFE_RUNTIME_PREVIEW"
  );
  assert.throws(
    () => assertSafeRuntimePreview({ readOnly: true, writes: false, destructive: false, planFingerprint: "invalid" }),
    (error) => error.code === "MSE_25_31_VM_RUNTIME_FINGERPRINT_INVALID"
  );
});
