"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  legalRuntimeReadiness,
  applyLegalRuntimeToReadiness,
} = require("../src/modules/agency-launch/legal-runtime-readiness");
const {
  score,
  blockers,
} = require("../src/modules/agency-launch/prepublication-readiness");

function baseReport() {
  return {
    checks: [
      { code: "SITE", label: "Mini-site", required: true, passed: true },
      { code: "IDENTITY", label: "Identité", required: true, passed: true },
      { code: "GENERAL_CONTENT", label: "Pages générales", required: true, passed: true },
      { code: "LEGAL", label: "Informations légales", required: true, passed: true },
      { code: "SEO", label: "SEO", required: true, passed: true },
    ],
    readiness: {
      score: 100,
      grade: "A",
      ready: true,
      blockers: [],
    },
  };
}

test("MSE-25.9 legal readiness accepts inherited tenant legal content", async () => {
  let captured = null;
  const prisma = {
    legalProfile: {
      findMany: async (args) => {
        captured = args;
        return [{
          id: "legal-shared",
          agencyId: null,
          legalNoticeContent: "Mentions légales complètes",
          privacyPolicyContent: "Politique de confidentialité complète",
        }];
      },
    },
  };

  const runtime = await legalRuntimeReadiness(prisma, "tenant-mondescale", 6);

  assert.equal(runtime.passed, true);
  assert.equal(runtime.inherited, true);
  assert.equal(runtime.legalNotice, true);
  assert.equal(runtime.privacyPolicy, true);
  assert.equal(captured.where.tenantId, "tenant-mondescale");
  assert.deepEqual(captured.where.OR, [
    { agencyId: null },
    { agencyId: 6 },
  ]);
});

test("MSE-25.9 agency legal override can complete shared legal content", async () => {
  const prisma = {
    legalProfile: {
      findMany: async () => [
        {
          id: "legal-shared",
          agencyId: null,
          legalNoticeContent: "Mentions légales société",
          privacyPolicyContent: null,
        },
        {
          id: "legal-agency",
          agencyId: 6,
          legalNoticeContent: null,
          privacyPolicyContent: "Confidentialité agence",
        },
      ],
    },
  };

  const runtime = await legalRuntimeReadiness(prisma, "tenant-mondescale", 6);

  assert.equal(runtime.passed, true);
  assert.equal(runtime.hasOverride, true);
  assert.equal(runtime.sharedProfileId, "legal-shared");
  assert.equal(runtime.overrideProfileId, "legal-agency");
});

test("MSE-25.9 legal readiness fails when privacy content is missing", async () => {
  const prisma = {
    legalProfile: {
      findMany: async () => [{
        id: "legal-shared",
        agencyId: null,
        legalNoticeContent: "Mentions légales société",
        privacyPolicyContent: null,
      }],
    },
  };

  const runtime = await legalRuntimeReadiness(prisma, "tenant-mondescale", 6);

  assert.equal(runtime.passed, false);
  assert.equal(runtime.legalNotice, true);
  assert.equal(runtime.privacyPolicy, false);
});

test("MSE-25.9 missing legal runtime downgrades launch readiness and score", () => {
  const report = applyLegalRuntimeToReadiness(
    baseReport(),
    {
      available: true,
      passed: false,
      legalNotice: true,
      privacyPolicy: false,
    },
    { score, blockers }
  );

  const legal = report.checks.find((check) => check.code === "LEGAL");

  assert.equal(legal.passed, false);
  assert.equal(report.readiness.score, 85);
  assert.equal(report.readiness.grade, "B");
  assert.equal(report.readiness.ready, false);
  assert.deepEqual(report.readiness.blockers, [
    { code: "LEGAL", label: "Informations légales" },
  ]);
});

test("MSE-25.9 legal runtime fails closed when persistence support is unavailable", async () => {
  const runtime = await legalRuntimeReadiness({}, "tenant-mondescale", 6);

  assert.equal(runtime.available, false);
  assert.equal(runtime.passed, false);
});
