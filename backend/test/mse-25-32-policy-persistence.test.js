"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const PaymentPolicyRepository = require("../src/modules/flexible-payment-experience/policy-repository");
const {
  validatePaymentPolicyInput,
} = require("../src/modules/flexible-payment-experience/payment-experience");

function createDelegatePrisma(initial = null) {
  let stored = initial;
  return {
    agencyPaymentPolicy: {
      async findUnique({ where }) {
        return stored?.siteId === where.siteId ? stored : null;
      },
      async upsert({ where, create, update }) {
        stored = stored
          ? { ...stored, ...update, siteId: where.siteId }
          : { ...create, siteId: where.siteId };
        return stored;
      },
    },
  };
}

test("payment policy repository persists one normalized policy per AgencySite", async () => {
  const repository = new PaymentPolicyRepository(createDelegatePrisma());

  const saved = await repository.upsert("site-gien", {
    enabled: true,
    products: ["travel", "flight", "flight"],
    installmentCounts: [4, 3, 4],
    feeMode: "without-fees",
    disclaimer: " Sous réserve d’acceptation. ",
    ctaLabel: " Étudier mes possibilités ",
  });

  assert.deepEqual(saved, {
    enabled: true,
    products: ["travel", "flight"],
    installmentCounts: [3, 4],
    feeMode: "without-fees",
    ctaMode: "contact",
    disclaimer: "Sous réserve d’acceptation.",
    ctaLabel: "Étudier mes possibilités",
  });

  assert.deepEqual(await repository.findBySiteId("site-gien"), saved);
});

test("strict policy validation refuses enabled policies without a target product", () => {
  assert.throws(
    () => validatePaymentPolicyInput({ enabled: true, products: [] }),
    (error) => error.code === "FLEXIBLE_PAYMENT_POLICY_PRODUCTS_REQUIRED"
  );
});

test("strict policy validation accepts a disabled empty policy", () => {
  assert.deepEqual(validatePaymentPolicyInput({ enabled: false }), {
    enabled: false,
    products: [],
    installmentCounts: [],
    feeMode: "unspecified",
    ctaMode: "contact",
    disclaimer: "",
    ctaLabel: "Contacter mon agence",
  });
});

test("payment policy migration creates a dedicated one-to-one AgencySite table", () => {
  const sql = fs.readFileSync(
    path.join(
      __dirname,
      "../prisma/migrations/20260817230500_mse_25_32_agency_payment_policy/migration.sql"
    ),
    "utf8"
  );

  assert.match(sql, /CREATE TABLE "AgencyPaymentPolicy"/);
  assert.match(sql, /PRIMARY KEY \("siteId"\)/);
  assert.match(sql, /REFERENCES "AgencySite"\("id"\)/);
  assert.match(sql, /ON DELETE CASCADE/);
  assert.match(sql, /CHECK \("feeMode" IN \('unspecified', 'with-fees', 'without-fees'\)\)/);
});
