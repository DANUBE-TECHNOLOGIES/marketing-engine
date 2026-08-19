"use strict";

const { execFileSync } = require("node:child_process");
const { EXPECTED_BRANCH } = require("./mse-25-40-preflight");
const { run: runPreview } = require("./mse-25-40-network-preview");

function git(args) { return execFileSync("git", args, { encoding: "utf8" }).trim(); }
function repositoryState() {
  return { branch: git(["branch", "--show-current"]), head: git(["rev-parse", "HEAD"]), dirty: Boolean(git(["status", "--porcelain"])) };
}

async function health(origin, tenantSlug, request = fetch) {
  const response = await request(`${String(origin || "http://127.0.0.1:4000").replace(/\/+$/g, "")}/minisite-semantic-engine/health`, { headers: { "x-tenant-slug": tenantSlug || "mondescale" } });
  const payload = await response.json();
  if (!response.ok || payload?.ok !== true) throw new Error(payload?.message || `HTTP ${response.status}`);
  return payload;
}

async function run({ backendOrigin = process.env.BACKEND_ORIGIN || "http://127.0.0.1:4000", tenantSlug = process.env.TENANT_SLUG || "mondescale", emitOutput = true } = {}) {
  const repository = repositoryState();
  const runtimeHealth = await health(backendOrigin, tenantSlug);
  const preview = await runPreview({ backendOrigin, tenantSlug, emitOutput: false });
  const checks = {
    branch: repository.branch === EXPECTED_BRANCH,
    cleanWorktree: repository.dirty === false,
    healthReadOnly: runtimeHealth.readOnly === true && runtimeHealth.writes === false && runtimeHealth.destructive === false,
    doorwayGuard: runtimeHealth.doorwayGuard === true && runtimeHealth.locationExpansion === false && runtimeHealth.autoCreatePages === false,
    previewReadOnly: preview.readOnly === true && preview.writes === false && preview.destructive === false,
    fingerprint: /^[0-9a-f]{64}$/i.test(String(preview.planFingerprint || "")),
  };
  const readyForPreflight = Object.values(checks).every(Boolean);
  const result = { version: "mse-25.40", ok: readyForPreflight, readyForPreflight, publicWritesEnabled: false, repository, runtime: { backendOrigin, tenantSlug, health: runtimeHealth, planFingerprint: preview.planFingerprint, summary: preview.summary, excludedSites: preview.excludedSites || [] }, checks };
  if (emitOutput) console.log(JSON.stringify(result, null, 2));
  if (!readyForPreflight) process.exitCode = 1;
  return result;
}

if (require.main === module) run().catch((error) => { console.error(JSON.stringify({ ok: false, error: "MSE_25_40_VM_READINESS_FAILED", message: error.message }, null, 2)); process.exitCode = 1; });

module.exports = { health, repositoryState, run };
