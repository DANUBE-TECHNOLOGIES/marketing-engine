"use strict";

const REQUIRED_EXPORTS = [
  "buildPaymentPlacementPreview",
  "applyPaymentPlacementPreview",
  "rollbackPaymentPlacement",
  "buildFlexiblePaymentNetworkReadiness",
  "buildFlexiblePaymentNetworkPolicyPreview",
  "applyFlexiblePaymentNetworkPolicy",
  "buildFlexiblePaymentNetworkRolloutPreview",
  "applyFlexiblePaymentNetworkRollout",
  "buildFlexiblePaymentRolloutAudit",
  "buildFlexiblePaymentNetworkRollbackPreview",
  "applyFlexiblePaymentNetworkRollback",
  "buildFlexiblePaymentOperationalStatus",
];

function normalizeRegclass(value) {
  if (value === null || value === undefined) return null;
  return String(value).replace(/^"|"$/g, "");
}

async function buildFlexiblePaymentRuntimeReadiness(prisma, moduleContract = {}) {
  const checks = {
    database: false,
    paymentPolicyTable: false,
    paymentPolicyCtaMode: false,
    moduleContract: false,
  };
  const details = {
    missingModuleExports: REQUIRED_EXPORTS.filter((name) => typeof moduleContract[name] !== "function"),
    paymentPolicyTable: null,
    paymentPolicyCtaMode: null,
  };

  checks.moduleContract = details.missingModuleExports.length === 0;

  try {
    await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    checks.database = true;

    const tableRows = await prisma.$queryRawUnsafe(
      `SELECT to_regclass('public."AgencyPaymentPolicy"')::text AS table_name`
    );
    details.paymentPolicyTable = normalizeRegclass(tableRows?.[0]?.table_name);
    checks.paymentPolicyTable = Boolean(details.paymentPolicyTable);

    if (checks.paymentPolicyTable) {
      const columnRows = await prisma.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'AgencyPaymentPolicy' AND column_name = 'ctaMode' LIMIT 1`
      );
      details.paymentPolicyCtaMode = columnRows?.[0]?.column_name || null;
      checks.paymentPolicyCtaMode = details.paymentPolicyCtaMode === "ctaMode";
    }
  } catch (error) {
    details.paymentPolicyTableError = error?.message || String(error);
  }

  return {
    version: "mse-25.41",
    ready: Object.values(checks).every(Boolean),
    readOnly: true,
    writes: false,
    checks,
    details,
  };
}

module.exports = {
  REQUIRED_EXPORTS,
  buildFlexiblePaymentRuntimeReadiness,
  normalizeRegclass,
};
