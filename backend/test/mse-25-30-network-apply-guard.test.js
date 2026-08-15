"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_MAX_PREFLIGHT_AGE_MS,
  assertPreflightReport,
  requireConfirmation,
  tryWriteRolloutReport,
} = require("../scripts/mse-25-30-network-apply");

function validReport(now = Date.now()) {
  return {
    generatedAt: new Date(now - 60_000).toISOString(),
    repository: {
      branch: "feature/mse-25-30-local-seo-optimizer",
      head: "abc123",
    },
    backend: {
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
    },
    preview: {
      ok: true,
      rolloutBlocked: false,
      summary: { rolloutBlocked: false },
    },
  };
}

test("network apply exige la confirmation opérateur explicite", () => {
  assert.throws(
    () => requireConfirmation("no"),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_OPERATOR_CONFIRMATION_REQUIRED"
  );
  assert.doesNotThrow(() => requireConfirmation("YES"));
});

test("network apply accepte un preflight récent pour le même HEAD, tenant et backend", () => {
  const now = Date.now();
  const result = assertPreflightReport(validReport(now), {
    origin: "http://127.0.0.1:4000/",
    tenant: "mondescale",
    repository: { head: "abc123" },
    now,
  });
  assert.equal(result.ageMs, 60_000);
  assert.equal(result.maxAgeMs, DEFAULT_MAX_PREFLIGHT_AGE_MS);
});

test("network apply refuse un preflight bloqué", () => {
  const now = Date.now();
  const report = validReport(now);
  report.preview.rolloutBlocked = true;
  assert.throws(
    () => assertPreflightReport(report, {
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      repository: { head: "abc123" },
      now,
    }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_BLOCKED"
  );
});

test("network apply refuse un preflight expiré", () => {
  const now = Date.now();
  const report = validReport(now);
  report.generatedAt = new Date(now - DEFAULT_MAX_PREFLIGHT_AGE_MS - 1).toISOString();
  assert.throws(
    () => assertPreflightReport(report, {
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      repository: { head: "abc123" },
      now,
    }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_EXPIRED"
  );
});

test("network apply refuse un autre HEAD Git", () => {
  const now = Date.now();
  assert.throws(
    () => assertPreflightReport(validReport(now), {
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      repository: { head: "def456" },
      now,
    }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_HEAD_MISMATCH"
  );
});

test("network apply refuse un autre tenant ou backend", () => {
  const now = Date.now();
  assert.throws(
    () => assertPreflightReport(validReport(now), {
      origin: "http://127.0.0.1:4000",
      tenant: "other-tenant",
      repository: { head: "abc123" },
      now,
    }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_TENANT_MISMATCH"
  );

  assert.throws(
    () => assertPreflightReport(validReport(now), {
      origin: "http://127.0.0.1:4999",
      tenant: "mondescale",
      repository: { head: "abc123" },
      now,
    }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_BACKEND_MISMATCH"
  );
});

test("une erreur locale de persistance du rapport ne masque pas le succès du rollout", () => {
  const write = tryWriteRolloutReport(
    { result: { ok: true, rollbackManifest: [{ agencyId: 1, rollbackVersionId: 10 }] } },
    () => {
      const error = new Error("disk full");
      error.code = "ENOSPC";
      throw error;
    }
  );

  assert.equal(write.persisted, false);
  assert.equal(write.file, null);
  assert.equal(write.error.code, "MSE_25_30_ROLLOUT_REPORT_WRITE_FAILED");
  assert.match(write.error.message, /disk full/);
});

test("la persistance réussie du rapport reste explicitement tracée", () => {
  const write = tryWriteRolloutReport(
    { result: { ok: true } },
    () => ({ file: "/tmp/mse-25-30-rollout.json" })
  );

  assert.equal(write.persisted, true);
  assert.equal(write.file, "/tmp/mse-25-30-rollout.json");
  assert.equal(write.error, null);
});
