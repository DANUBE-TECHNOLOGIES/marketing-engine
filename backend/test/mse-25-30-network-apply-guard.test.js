"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_MAX_PREFLIGHT_AGE_MS,
  assertParameterOverridesMatch,
  assertPreflightReport,
  normalizeApprovedFingerprint,
  normalizeApprovedParameters,
  requireConfirmation,
  tryWriteRolloutReport,
} = require("../scripts/mse-25-30-network-apply");

const VALID_PLAN_FINGERPRINT = "a".repeat(64);
const VALID_PARAMETERS = Object.freeze({
  similarityThreshold: 0.78,
  minimumWords: 120,
  qualityMinimumWords: 180,
});

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
      planFingerprint: VALID_PLAN_FINGERPRINT,
      parameters: { ...VALID_PARAMETERS },
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
  assert.equal(result.planFingerprint, VALID_PLAN_FINGERPRINT);
  assert.deepEqual(result.parameters, VALID_PARAMETERS);
});

test("network apply refuse un preflight sans empreinte de plan approuvée", () => {
  const now = Date.now();
  const report = validReport(now);
  delete report.preview.planFingerprint;

  assert.throws(
    () => assertPreflightReport(report, {
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      repository: { head: "abc123" },
      now,
    }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_FINGERPRINT_INVALID"
  );
});

test("network apply refuse un preflight sans paramètres de garde approuvés", () => {
  const now = Date.now();
  const report = validReport(now);
  delete report.preview.parameters.qualityMinimumWords;

  assert.throws(
    () => assertPreflightReport(report, {
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      repository: { head: "abc123" },
      now,
    }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_PARAMETERS_INVALID"
  );
});

test("network apply normalise une empreinte SHA-256 approuvée sans modifier sa valeur", () => {
  assert.equal(normalizeApprovedFingerprint(`  ${VALID_PLAN_FINGERPRINT.toUpperCase()}  `), VALID_PLAN_FINGERPRINT);
  assert.throws(
    () => normalizeApprovedFingerprint("abc123"),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_FINGERPRINT_INVALID"
  );
});

test("network apply exige trois paramètres numériques approuvés", () => {
  assert.deepEqual(normalizeApprovedParameters({
    similarityThreshold: "0.78",
    minimumWords: "120",
    qualityMinimumWords: "180",
  }), VALID_PARAMETERS);

  assert.throws(
    () => normalizeApprovedParameters({ similarityThreshold: 0.78, minimumWords: 120 }),
    (error) => error?.code === "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_PARAMETERS_INVALID"
  );
});

test("network apply refuse toute surcharge de paramètre différente du preflight approuvé", () => {
  assert.doesNotThrow(() => assertParameterOverridesMatch(VALID_PARAMETERS, {
    similarityThreshold: "0.78",
    minimumWords: "120",
    qualityMinimumWords: "180",
  }));

  assert.throws(
    () => assertParameterOverridesMatch(VALID_PARAMETERS, { minimumWords: 121 }),
    (error) => {
      assert.equal(error?.code, "MSE_25_30_NETWORK_ROLLOUT_PREFLIGHT_PARAMETER_MISMATCH");
      assert.deepEqual(error?.details?.mismatches, [
        { key: "minimumWords", approved: 120, requested: 121 },
      ]);
      return true;
    }
  );
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
