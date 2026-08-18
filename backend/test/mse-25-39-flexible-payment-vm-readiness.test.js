"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  REQUIRED_MODULE_EXPORTS,
  checkFlexiblePaymentVmReadiness,
  normalizeTableResult,
  validateModuleExports,
} = require("../src/modules/flexible-payment-experience/runtime-readiness");

function validExports() {
  return Object.fromEntries(REQUIRED_MODULE_EXPORTS.map((name) => [name, () => {}]));
}

test("MSE-25.39 validates the complete flexible payment module contract", () => {
  assert.equal(validateModuleExports(validExports()).ok, true);
  const invalid = validateModuleExports({});
  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.missing, REQUIRED_MODULE_EXPORTS);
});

test("MSE-25.39 normalizes PostgreSQL to_regclass results", () => {
  assert.equal(normalizeTableResult([{ table_name: '"AgencyPaymentPolicy"' }]), '"AgencyPaymentPolicy"');
  assert.equal(normalizeTableResult([{ table_name: null }]), null);
});

test("MSE-25.39 reports a ready VM without performing writes", async () => {
  const queries = [];
  const prisma = {
    $queryRawUnsafe: async (sql) => {
      queries.push(sql);
      if (sql.includes("to_regclass")) return [{ table_name: '"AgencyPaymentPolicy"' }];
      return [{ ok: 1 }];
    },
  };

  const report = await checkFlexiblePaymentVmReadiness({ prisma, moduleExports: validExports() });
  assert.equal(report.ready, true);
  assert.equal(report.readOnly, true);
  assert.equal(report.writes, false);
  assert.equal(queries.length, 2);
  assert.match(queries[0], /SELECT 1/);
  assert.match(queries[1], /AgencyPaymentPolicy/);
});

test("MSE-25.39 fails closed when the payment policy migration is missing", async () => {
  const prisma = {
    $queryRawUnsafe: async (sql) => sql.includes("to_regclass") ? [{ table_name: null }] : [{ ok: 1 }],
  };
  const report = await checkFlexiblePaymentVmReadiness({ prisma, moduleExports: validExports() });
  assert.equal(report.ready, false);
  assert.equal(report.checks.database, true);
  assert.equal(report.checks.paymentPolicyTable, false);
});

test("MSE-25.39 fails closed when the database is unavailable", async () => {
  const prisma = {
    $queryRawUnsafe: async () => { throw new Error("database unavailable"); },
  };
  const report = await checkFlexiblePaymentVmReadiness({ prisma, moduleExports: validExports() });
  assert.equal(report.ready, false);
  assert.equal(report.checks.database, false);
  assert.match(report.details.databaseError, /database unavailable/);
});
