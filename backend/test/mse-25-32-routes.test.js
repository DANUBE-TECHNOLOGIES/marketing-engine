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

function createPrisma(site = siteFixture()) {
  return {
    agencySite: {
      async findUnique({ where }) {
        return where.slug === site?.slug ? site : null;
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
    assert.equal(body.site.slug, "gien");
    assert.equal(body.preview.readOnly, true);
    assert.equal(body.preview.writes, false);
    assert.equal(typeof body.preview.fingerprint, "string");
    assert.equal(body.preview.fingerprint.length, 64);
    assert.equal(body.preview.proposals.length, 2);
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
