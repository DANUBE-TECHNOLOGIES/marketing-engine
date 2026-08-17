"use strict";

const http = require("node:http");
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const createFlexiblePaymentRoutes = require("../src/modules/flexible-payment-experience/routes");

function siteFixture() {
  return {
    id: "site-1",
    agencyId: 12,
    slug: "gien",
    agency: { id: 12, name: "Mondescale Gien" },
    pages: [
      {
        id: "home-1",
        siteId: "site-1",
        slug: "home",
        status: "published",
        published: true,
        displayOrder: 0,
        blocks: [],
      },
      {
        id: "flight-1",
        siteId: "site-1",
        slug: "billetterie-et-vols",
        status: "published",
        published: true,
        displayOrder: 10,
        blocks: [],
      },
    ],
  };
}

function createPrisma(site = siteFixture(), initialPolicy = null) {
  let paymentPolicy = initialPolicy;

  return {
    agencySite: {
      async findUnique({ where }) {
        if (where.slug !== undefined) {
          return where.slug === site?.slug ? site : null;
        }
        if (where.id !== undefined) {
          return where.id === site?.id ? site : null;
        }
        return null;
      },
    },
    agencyPaymentPolicy: {
      async findUnique({ where }) {
        return where.siteId === site?.id ? paymentPolicy : null;
      },
      async upsert({ where, create, update }) {
        if (where.siteId !== site?.id) return null;
        paymentPolicy = paymentPolicy
          ? { ...paymentPolicy, ...update, siteId: site.id }
          : { ...create, siteId: site.id };
        return paymentPolicy;
      },
    },
    agencySitePage: {
      async findFirst() {
        return null;
      },
    },
  };
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
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("preview route normalizes the site slug and returns a read-only fingerprinted plan", async () => {
  await withServer(createPrisma(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agency-sites/GIEN/flexible-payment/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        policy: {
          enabled: true,
          products: ["flight"],
          installmentCounts: [3, 4],
          feeMode: "without-fees",
        },
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.mode, "preview");
    assert.equal(body.policySource, "override");
    assert.equal(body.site.slug, "gien");
    assert.equal(body.preview.readOnly, true);
    assert.equal(body.preview.writes, false);
    assert.equal(typeof body.preview.fingerprint, "string");
    assert.equal(body.preview.fingerprint.length, 64);
    assert.equal(body.preview.proposals.length, 2);
  });
});

test("preview route accepts the AgencySite id used by Website Designer V2", async () => {
  await withServer(createPrisma(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agency-sites/site-1/flexible-payment/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        policy: { enabled: true, products: ["flight"] },
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.site.id, "site-1");
    assert.equal(body.site.slug, "gien");
    assert.equal(body.preview.proposals.length, 2);
  });
});

test("preview route uses the persisted policy when no override is supplied", async () => {
  const persisted = {
    siteId: "site-1",
    enabled: true,
    products: ["flight"],
    installmentCounts: [3],
    feeMode: "with-fees",
    disclaimer: "Sous réserve d’acceptation.",
    ctaLabel: "Nous contacter",
  };

  await withServer(createPrisma(siteFixture(), persisted), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agency-sites/gien/flexible-payment/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.policySource, "persisted");
    assert.deepEqual(body.preview.policy.products, ["flight"]);
    assert.deepEqual(body.preview.policy.installmentCounts, [3]);
    assert.equal(body.preview.proposals.length, 2);
  });
});

test("policy route persists a validated agency policy and immediately rebuilds preview", async () => {
  await withServer(createPrisma(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agency-sites/gien/flexible-payment/policy`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        confirm: true,
        policy: {
          enabled: true,
          products: ["flight", "travel"],
          installmentCounts: [4, 3, 4],
          feeMode: "without-fees",
          disclaimer: "Sous réserve d’acceptation du dossier.",
          ctaLabel: "Étudier mes possibilités",
        },
      }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.mode, "policy-update");
    assert.equal(body.configured, true);
    assert.deepEqual(body.policy.products, ["flight", "travel"]);
    assert.deepEqual(body.policy.installmentCounts, [3, 4]);
    assert.equal(body.policy.feeMode, "without-fees");
    assert.equal(body.preview.proposals.length, 2);

    const readResponse = await fetch(`${baseUrl}/api/agency-sites/gien/flexible-payment`);
    const readBody = await readResponse.json();
    assert.equal(readBody.configured, true);
    assert.equal(readBody.policy.ctaLabel, "Étudier mes possibilités");
  });
});

test("policy route refuses writes without explicit confirmation", async () => {
  await withServer(createPrisma(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agency-sites/gien/flexible-payment/policy`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        policy: { enabled: true, products: ["flight"] },
      }),
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, "FLEXIBLE_PAYMENT_POLICY_CONFIRM_REQUIRED");
  });
});

test("policy route rejects unsupported commercial claims instead of silently normalizing them", async () => {
  await withServer(createPrisma(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agency-sites/gien/flexible-payment/policy`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        confirm: true,
        policy: {
          enabled: true,
          products: ["flight"],
          installmentCounts: [36],
          feeMode: "free-forever",
        },
      }),
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.match(body.code, /^FLEXIBLE_PAYMENT_POLICY_INVALID_/);
  });
});

test("preview route returns 404 for an unknown mini-site", async () => {
  await withServer(createPrisma(null), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agency-sites/unknown/flexible-payment/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ policy: { enabled: true, products: ["flight"] } }),
    });

    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.code, "FLEXIBLE_PAYMENT_SITE_NOT_FOUND");
  });
});

test("apply route refuses a write without confirm=true before opening a transaction", async () => {
  const prisma = createPrisma();
  prisma.$transaction = async () => {
    throw new Error("transaction should not be opened without confirmation");
  };

  await withServer(prisma, async (baseUrl) => {
    const previewResponse = await fetch(`${baseUrl}/api/agency-sites/gien/flexible-payment/preview`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ policy: { enabled: true, products: ["flight"] } }),
    });
    const previewBody = await previewResponse.json();

    const response = await fetch(`${baseUrl}/api/agency-sites/gien/flexible-payment/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        policy: { enabled: true, products: ["flight"] },
        previewFingerprint: previewBody.preview.fingerprint,
      }),
    });

    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.code, "FLEXIBLE_PAYMENT_CONFIRM_REQUIRED");
  });
});

test("rollback route refuses a page that does not belong to the requested mini-site", async () => {
  await withServer(createPrisma(), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/agency-sites/gien/flexible-payment/rollback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pageId: "foreign-page",
        blockId: "block-1",
        confirm: true,
      }),
    });

    assert.equal(response.status, 404);
    const body = await response.json();
    assert.equal(body.code, "FLEXIBLE_PAYMENT_PAGE_NOT_FOUND");
  });
});
