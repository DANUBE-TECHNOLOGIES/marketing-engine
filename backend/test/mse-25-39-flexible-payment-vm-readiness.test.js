"use strict";

const http = require("node:http");
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const createFlexiblePaymentRoutes = require("../src/modules/flexible-payment-experience/routes");
const {
  REQUIRED_MODULE_EXPORTS,
  checkFlexiblePaymentVmReadiness,
  normalizeTableResult,
  validateModuleExports,
} = require("../src/modules/flexible-payment-experience/runtime-readiness");

function validExports() {
  return Object.fromEntries(REQUIRED_MODULE_EXPORTS.map((name) => [name, () => {}]));
}

async function withServer(prisma, callback) {
  const app = express();
  app.use(express.json());
  app.use(createFlexiblePaymentRoutes({ prisma }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test("MSE-25.39 validates the complete flexible payment module contract", () => {
  assert.equal(validateModuleExports(validExports()).ok, true);
  const invalid = validateModuleExports({});
  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.missing, REQUIRED_MODULE_EXPORTS);
});

test("MSE-25.39 normalizes PostgreSQL to_regclass results", () => {
  assert.equal(normalizeTableResult([{ table_name: '\"AgencyPaymentPolicy\"' }]), '\"AgencyPaymentPolicy\"');
  assert.equal(normalizeTableResult([{ table_name: null }]), null);
});

test("MSE-25.39 reports a ready VM without performing writes", async () => {
  const queries = [];
  const prisma = {
    $queryRawUnsafe: async (sql) => {
      queries.push(sql);
      if (sql.includes("to_regclass")) return [{ table_name: '\"AgencyPaymentPolicy\"' }];
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
  assert.match(queries[1], /::text/);
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

test("MSE-25.39 exposes a read-only network operational status endpoint", async () => {
  const site = {
    id: "site-1",
    slug: "gien",
    agencyId: "agency-1",
    agency: { id: "agency-1", name: "Mondescale Gien" },
    pages: [{
      id: "page-home",
      siteId: "site-1",
      slug: "home",
      status: "published",
      published: true,
      displayOrder: 0,
      blocks: [],
    }],
  };
  const policy = {
    siteId: "site-1",
    enabled: true,
    products: ["travel"],
    installmentCounts: [3],
    feeMode: "with-fees",
    disclaimer: "Sous réserve d'acceptation.",
    ctaLabel: "Nous contacter",
  };
  const prisma = {
    agencySite: {
      findMany: async () => [site],
      findUnique: async () => null,
    },
    agencyPaymentPolicy: {
      findUnique: async ({ where }) => where.siteId === site.id ? policy : null,
    },
  };

  await withServer(prisma, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/flexible-payment/operational-status`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.readOnly, true);
    assert.equal(body.writes, false);
    assert.equal(body.summary.total, 1);
    assert.equal(body.sites[0].slug, "gien");
    assert.equal(typeof body.fingerprint, "string");
    assert.equal(body.fingerprint.length, 64);
  });
});
