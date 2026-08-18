"use strict";

const REQUIRED_MODULE_EXPORTS = [
  "buildFlexiblePaymentOperationalStatus",
  "buildFlexiblePaymentNetworkReadiness",
  "buildFlexiblePaymentNetworkRolloutPreview",
  "applyFlexiblePaymentNetworkRollback",
];

function normalizeTableResult(rows) {
  const row = Array.isArray(rows) ? rows[0] : rows;
  return row?.table_name || row?.tableName || row?.to_regclass || null;
}

function validateModuleExports(moduleExports = {}) {
  const missing = REQUIRED_MODULE_EXPORTS.filter((name) => typeof moduleExports[name] !== "function");
  return {
    ok: missing.length === 0,
    required: REQUIRED_MODULE_EXPORTS,
    missing,
  };
}

async function checkFlexiblePaymentVmReadiness({ prisma, moduleExports } = {}) {
  if (!prisma || typeof prisma.$queryRawUnsafe !== "function") {
    throw new TypeError("MSE-25.39 VM readiness requires a Prisma client.");
  }

  const moduleCheck = validateModuleExports(moduleExports);
  const checks = {
    database: false,
    paymentPolicyTable: false,
    moduleContract: moduleCheck.ok,
  };
  const details = {
    missingModuleExports: moduleCheck.missing,
    paymentPolicyTable: null,
  };

  try {
    await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    checks.database = true;
  } catch (error) {
    details.databaseError = error?.message || String(error);
  }

  if (checks.database) {
    try {
      const rows = await prisma.$queryRawUnsafe("SELECT to_regclass('public.\"AgencyPaymentPolicy\"') AS table_name");
      const tableName = normalizeTableResult(rows);
      details.paymentPolicyTable = tableName;
      checks.paymentPolicyTable = Boolean(tableName);
    } catch (error) {
      details.paymentPolicyTableError = error?.message || String(error);
    }
  }

  const ready = Object.values(checks).every(Boolean);
  return {
    version: "mse-25.39",
    ready,
    readOnly: true,
    writes: false,
    checks,
    details,
  };
}

module.exports = {
  REQUIRED_MODULE_EXPORTS,
  checkFlexiblePaymentVmReadiness,
  normalizeTableResult,
  validateModuleExports,
};
