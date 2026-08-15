"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { writeRolloutReport } = require("../scripts/mse-25-30-network-apply");
const {
  assertRollbackContext,
  loadManifest,
} = require("../scripts/mse-25-30-network-rollback");

function tempFile(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-30-"));
  return path.join(dir, name);
}

test("apply persiste un rapport contextuel directement exploitable par rollback", () => {
  const output = tempFile("rollout.json");
  const repository = { branch: "feature/mse-25-30-local-seo-optimizer", head: "abc123" };
  const result = {
    ok: true,
    rollbackManifest: [
      { agencyId: 1, siteSlug: "gien", slug: "home", rollbackVersionId: 101 },
      { agencyId: 2, siteSlug: "maurepas", slug: "agence", rollbackVersionId: 202 },
    ],
  };

  const written = writeRolloutReport({
    output,
    repository,
    origin: "http://127.0.0.1:4000",
    tenant: "mondescale",
    preflight: { reportPath: "/tmp/preflight.json", repositoryHead: "abc123" },
    result,
  });

  assert.equal(written.file, output);
  const loaded = loadManifest(output);
  assert.equal(loaded.legacy, false);
  assert.equal(loaded.manifest.length, 2);
  assert.equal(loaded.context.repository.head, "abc123");
  assert.equal(loaded.context.backend.tenant, "mondescale");
});

test("rollback refuse un backend ou tenant différent du rollout", () => {
  const context = {
    type: "mse-25.30-network-rollout-report",
    backend: { origin: "http://127.0.0.1:4000", tenant: "mondescale" },
  };

  assert.doesNotThrow(() => assertRollbackContext(context, {
    origin: "http://127.0.0.1:4000/",
    tenant: "mondescale",
  }));

  assert.throws(
    () => assertRollbackContext(context, { origin: "http://127.0.0.1:4999", tenant: "mondescale" }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLBACK_BACKEND_MISMATCH",
  );
  assert.throws(
    () => assertRollbackContext(context, { origin: "http://127.0.0.1:4000", tenant: "other" }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLBACK_TENANT_MISMATCH",
  );
});

test("rollback refuse par défaut un manifeste legacy non contextualisé", () => {
  const output = tempFile("legacy.json");
  fs.writeFileSync(output, JSON.stringify([
    { agencyId: 1, slug: "home", rollbackVersionId: 101 },
  ]));

  const previous = process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST;
  delete process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST;
  try {
    assert.throws(
      () => loadManifest(output),
      (error) => error?.code === "MSE_25_30_NETWORK_ROLLBACK_CONTEXT_REQUIRED",
    );
  } finally {
    if (previous === undefined) delete process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST;
    else process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST = previous;
  }
});

test("rollback legacy reste disponible uniquement avec opt-in explicite", () => {
  const output = tempFile("legacy-opt-in.json");
  fs.writeFileSync(output, JSON.stringify([
    { agencyId: 1, slug: "home", rollbackVersionId: 101 },
  ]));

  const previous = process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST;
  process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST = "YES";
  try {
    const loaded = loadManifest(output);
    assert.equal(loaded.legacy, true);
    assert.equal(loaded.manifest.length, 1);
  } finally {
    if (previous === undefined) delete process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST;
    else process.env.MSE_25_30_ALLOW_LEGACY_ROLLBACK_MANIFEST = previous;
  }
});
