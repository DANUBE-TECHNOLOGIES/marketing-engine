"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  assertReport,
} = require("../scripts/mse-25-31-preflight-check");
const { EXPECTED_BRANCH } = require("../scripts/mse-25-31-preflight");

const FP = "c".repeat(64);
const HEAD = "d".repeat(40);

function validReport() {
  return {
    version: "mse-25.31",
    operation: "preflight-quality-uplift",
    readOnly: true,
    writes: false,
    destructive: false,
    repository: { branch: EXPECTED_BRANCH, head: HEAD, dirty: false },
    context: {
      backendOrigin: "http://127.0.0.1:4000",
      tenantSlug: "mondescale",
      minimumWords: 120,
      topPages: 20,
    },
    planFingerprint: FP,
    preview: {
      readOnly: true,
      writes: false,
      destructive: false,
      planFingerprint: FP,
    },
    determinism: {
      verified: true,
      previewCount: 2,
      firstFingerprint: FP,
      secondFingerprint: FP,
    },
  };
}

test("offline check accepts a coherent read-only preflight report", () => {
  const result = assertReport(validReport(), {
    expectedHead: HEAD,
    backendOrigin: "http://127.0.0.1:4000/",
    tenantSlug: "mondescale",
    minimumWords: 120,
  });
  assert.equal(result.ok, true);
  assert.equal(result.planFingerprint, FP);
  assert.equal(result.repository.head, HEAD);
});

test("offline check rejects a preview fingerprint substituted after preflight", () => {
  const report = validReport();
  report.preview.planFingerprint = "e".repeat(64);
  assert.throws(
    () => assertReport(report),
    (error) => error.code === "MSE_25_31_PREFLIGHT_REPORT_FINGERPRINT_MISMATCH"
  );
});

test("offline check rejects an incoherent determinism proof", () => {
  const report = validReport();
  report.determinism.secondFingerprint = "f".repeat(64);
  assert.throws(
    () => assertReport(report),
    (error) => error.code === "MSE_25_31_PREFLIGHT_REPORT_DETERMINISM_INVALID"
  );
});

test("offline check binds report to branch head tenant backend and parameters", () => {
  for (const [options, code] of [
    [{ expectedBranch: "main" }, "MSE_25_31_PREFLIGHT_REPORT_BRANCH_MISMATCH"],
    [{ expectedHead: "0".repeat(40) }, "MSE_25_31_PREFLIGHT_REPORT_HEAD_MISMATCH"],
    [{ backendOrigin: "http://127.0.0.1:4999" }, "MSE_25_31_PREFLIGHT_REPORT_BACKEND_MISMATCH"],
    [{ tenantSlug: "other" }, "MSE_25_31_PREFLIGHT_REPORT_TENANT_MISMATCH"],
    [{ minimumWords: 140 }, "MSE_25_31_PREFLIGHT_REPORT_PARAMETER_MISMATCH"],
  ]) {
    assert.throws(
      () => assertReport(validReport(), options),
      (error) => error.code === code
    );
  }
});

test("offline check rejects any report that is not strictly read-only", () => {
  const report = validReport();
  report.writes = true;
  assert.throws(
    () => assertReport(report),
    (error) => error.code === "MSE_25_31_PREFLIGHT_REPORT_UNSAFE"
  );
});
