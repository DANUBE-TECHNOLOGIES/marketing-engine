"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  applyLegalRuntimeToReadiness,
  legalRoutesPresent,
} = require("../src/modules/agency-launch/legal-runtime-readiness");

const score = (checks) => checks.filter((check) => check.passed).length * 50;
const blockers = (checks) => checks.filter((check) => check.required && !check.passed).map((check) => ({ code: check.code }));

function report(items) {
  return {
    checks: [
      { code: "SITE", required: true, passed: true },
      { code: "LEGAL", required: true, passed: false, items },
    ],
    readiness: { score: 50, grade: "C", ready: false, blockers: [{ code: "LEGAL" }] },
  };
}

test("legal readiness accepts empty designer legal pages when routes exist and runtime is complete", () => {
  const items = [
    { slug: "mentions-legales", exists: true, contentState: { hasVisibleContent: false } },
    { slug: "confidentialite", exists: true, contentState: { hasVisibleContent: false } },
  ];

  assert.equal(legalRoutesPresent({ items }), true);

  const result = applyLegalRuntimeToReadiness(
    report(items),
    { passed: true, legalNotice: true, privacyPolicy: true },
    { score, blockers }
  );

  const legal = result.checks.find((check) => check.code === "LEGAL");
  assert.equal(legal.passed, true);
  assert.equal(legal.routesPresent, true);
  assert.equal(legal.contentSource, "legal-runtime");
  assert.equal(result.readiness.ready, true);
});

test("legal readiness still blocks a missing legal route", () => {
  const result = applyLegalRuntimeToReadiness(
    report([
      { slug: "mentions-legales", exists: true },
      { slug: "confidentialite", exists: false },
    ]),
    { passed: true, legalNotice: true, privacyPolicy: true },
    { score, blockers }
  );

  assert.equal(result.checks.find((check) => check.code === "LEGAL").passed, false);
  assert.equal(result.readiness.ready, false);
});

test("legal readiness blocks incomplete runtime even when both routes exist", () => {
  const result = applyLegalRuntimeToReadiness(
    report([
      { slug: "mentions-legales", exists: true },
      { slug: "confidentialite", exists: true },
    ]),
    { passed: false, legalNotice: true, privacyPolicy: false },
    { score, blockers }
  );

  assert.equal(result.checks.find((check) => check.code === "LEGAL").passed, false);
  assert.equal(result.readiness.ready, false);
});
