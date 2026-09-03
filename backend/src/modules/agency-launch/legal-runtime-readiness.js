"use strict";

function defined(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function resolvedLegalValue(shared, override, field) {
  if (defined(override?.[field])) return String(override[field]).trim();
  if (defined(shared?.[field])) return String(shared[field]).trim();
  return null;
}

async function legalRuntimeReadiness(prisma, tenantId, agencyId) {
  if (!prisma?.legalProfile?.findMany) {
    return {
      available: false,
      passed: false,
      reason: "legal-profile-model-unavailable",
      legalNotice: false,
      privacyPolicy: false,
    };
  }

  const profiles = await prisma.legalProfile.findMany({
    where: {
      tenantId: String(tenantId),
      OR: [
        { agencyId: null },
        { agencyId: Number(agencyId) },
      ],
    },
    select: {
      id: true,
      agencyId: true,
      legalNoticeContent: true,
      privacyPolicyContent: true,
    },
  });

  const shared = profiles.find((profile) => profile.agencyId === null) || null;
  const override = profiles.find((profile) => Number(profile.agencyId) === Number(agencyId)) || null;
  const legalNotice = resolvedLegalValue(shared, override, "legalNoticeContent");
  const privacyPolicy = resolvedLegalValue(shared, override, "privacyPolicyContent");

  return {
    available: true,
    passed: Boolean(legalNotice && privacyPolicy),
    inherited: Boolean(shared),
    hasOverride: Boolean(override),
    legalNotice: Boolean(legalNotice),
    privacyPolicy: Boolean(privacyPolicy),
    sharedProfileId: shared?.id || null,
    overrideProfileId: override?.id || null,
  };
}

function readinessGrade(value) {
  const score = Number(value || 0);
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "E";
}

function legalRoutesPresent(check) {
  const items = Array.isArray(check?.items) ? check.items : [];
  return items.length > 0 && items.every((item) => item?.exists === true);
}

function applyLegalRuntimeToReadiness(report, runtime, { score, blockers } = {}) {
  if (!report || !runtime || !Array.isArray(report.checks)) return report;

  const checks = report.checks.map((check) => {
    if (String(check?.code || "").toUpperCase() !== "LEGAL") return check;

    const routesPresent = legalRoutesPresent(check);

    return {
      ...check,
      passed: routesPresent && runtime.passed === true,
      routesPresent,
      contentSource: "legal-runtime",
      runtime,
    };
  });

  const nextScore = typeof score === "function"
    ? score(checks)
    : Number(report?.readiness?.score || 0);
  const nextBlockers = typeof blockers === "function"
    ? blockers(checks)
    : (report?.readiness?.blockers || []);

  return {
    ...report,
    checks,
    readiness: {
      ...(report.readiness || {}),
      score: nextScore,
      grade: readinessGrade(nextScore),
      ready: nextBlockers.length === 0,
      blockers: nextBlockers,
    },
  };
}

module.exports = {
  defined,
  resolvedLegalValue,
  legalRuntimeReadiness,
  legalRoutesPresent,
  applyLegalRuntimeToReadiness,
  readinessGrade,
};
