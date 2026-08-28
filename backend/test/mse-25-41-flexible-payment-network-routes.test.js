"use strict";

const http = require("node:http");
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const createFlexiblePaymentRoutes = require("../src/modules/flexible-payment-experience/routes");

async function withServer(prisma, callback) {
  const app = express();
  app.use(express.json());
  app.use(createFlexiblePaymentRoutes({ prisma }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await callback(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function mockPrisma() {
  const sites = [
    {
      id: "site-a",
      slug: "agency-a",
      agencyId: 1,
      agency: { id: 1, name: "Agency A" },
      pages: [{ id: "page-a", siteId: "site-a", slug: "home", status: "published", published: true, displayOrder: 0, blocks: [] }],
    },
    {
      id: "site-b",
      slug: "agency-b",
      agencyId: 2,
      agency: { id: 2, name: "Agency B" },
      pages: [{ id: "page-b", siteId: "site-b", slug: "home", status: "published", published: true, displayOrder: 0, blocks: [] }],
    },
  ];
  const policies = new Map([["site-b", {
    siteId: "site-b", enabled: true, products: ["travel"], installmentCounts: [],
    feeMode: "unspecified", ctaMode: "contact", disclaimer: "", ctaLabel: "Nous contacter",
  }]]);
  return {
    agencySite: { findMany: async () => sites },
    agencyPaymentPolicy: {
      findUnique: async ({ where }) => policies.get(where.siteId) || null,
      upsert: async ({ where, create, update }) => {
        const value = policies.has(where.siteId) ? { siteId: where.siteId, ...update } : create;
        policies.set(where.siteId, value);
        return value;
      },
    },
  };
}

test("MSE-25.41 exposes a read-only network policy preview", async () => {
  await withServer(mockPrisma(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/flexible-payment/network-policy/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.readOnly, true);
    assert.equal(body.writes, false);
    assert.equal(body.summary.configurable, 1);
    assert.equal(body.summary.preserved, 1);
    assert.equal(body.policy.ctaMode, "contact");
  });
});

test("MSE-25.41 network policy apply fails closed without confirm=true", async () => {
  await withServer(mockPrisma(), async (baseUrl) => {
    const previewResponse = await fetch(`${baseUrl}/api/flexible-payment/network-policy/preview`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    });
    const preview = await previewResponse.json();
    const response = await fetch(`${baseUrl}/api/flexible-payment/network-policy/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ siteIds: ["site-a"], previewFingerprint: preview.fingerprint }),
    });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, "FLEXIBLE_PAYMENT_NETWORK_POLICY_CONFIRM_REQUIRED");
  });
});
