"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildFlexiblePaymentOperationalStatus,
  siteOperationalRow,
} = require("../src/modules/flexible-payment-experience/operational-status");

const {
  planPaymentPlacements,
} = require("../src/modules/flexible-payment-experience/payment-experience");

function block(overrides = {}) {
  const plan = planPaymentPlacements({
    policy: {
      enabled: true,
      products: ["flight"],
    },
    site: {
      pages: [{
        id: "page-canonical",
        slug: "home",
        published: true,
        blocks: [],
      }],
    },
  });

  if (plan.proposals.length !== 1) {
    throw new Error(
      `Expected one canonical payment proposal, got ${plan.proposals.length}`
    );
  }

  const canonicalContent =
    plan.proposals[0].block.content;

  return {
    id: "block-1",
    blockType: "flexible_payment",
    content: canonicalContent,
    settings: {
      variant: canonicalContent.variant,
    },
    seo: {
      purpose: "flexible-payment-experience",
      source: "mse-25.32",
    },
    ...overrides,
  };
}

function site(overrides = {}) {
  return {
    id: "site-1",
    slug: "gien",
    agencyId: "agency-1",
    paymentPolicy: { enabled: true, products: ["flight"] },
    pages: [{ id: "page-1", slug: "home", published: true, blocks: [] }],
    ...overrides,
  };
}

test("reports a configured eligible site as healthy before deployment", () => {
  const row = siteOperationalRow(site());
  assert.equal(row.readinessStatus, "ready");
  assert.equal(row.health, "healthy");
  assert.equal(row.deployedBlocks, 0);
});

test("reports a deployed site as healthy", () => {
  const row = siteOperationalRow(site({
    pages: [{ id: "page-1", slug: "home", published: true, blocks: [block()] }],
  }));
  assert.equal(row.readinessStatus, "deployed");
  assert.equal(row.health, "healthy");
  assert.equal(row.deployedBlocks, 1);
});

test("reports an owned stale deployed block as ready for reconciliation", () => {
  const row = siteOperationalRow(site({
    pages: [{
      id: "page-1",
      slug: "home",
      published: true,
      blocks: [
        block({
          content: {
            title: "Ancien contenu",
            products: ["flight"],
            installmentCounts: [],
            feeMode: "unspecified",
          },
        }),
      ],
    }],
  }));

  assert.equal(row.readinessStatus, "ready");
  assert.equal(row.deployedBlocks, 1);
  assert.ok(row.proposals > 0);
  assert.equal(row.health, "attention");
  assert.ok(row.anomalies.includes("ready-with-existing-blocks"));
});

test("flags blocks left behind when the policy is disabled", () => {
  const row = siteOperationalRow(site({
    paymentPolicy: { enabled: false, products: [] },
    pages: [{ id: "page-1", slug: "home", published: true, blocks: [block()] }],
  }));
  assert.equal(row.health, "attention");
  assert.ok(row.anomalies.includes("blocks-present-while-policy-disabled"));
});

test("flags blocks without a persisted policy", () => {
  const current = site();
  delete current.paymentPolicy;
  current.pages[0].blocks = [block()];
  const row = siteOperationalRow(current);
  assert.equal(row.health, "blocked");
  assert.ok(row.anomalies.includes("blocks-present-without-persisted-policy"));
});

test("network snapshot is read-only, deterministic and summarizes health", () => {
  const sites = [
    site(),
    site({ id: "site-2", slug: "nevers", agencyId: "agency-2", paymentPolicy: { enabled: false, products: [] } }),
  ];
  const first = buildFlexiblePaymentOperationalStatus(sites);
  const second = buildFlexiblePaymentOperationalStatus([...sites].reverse());
  assert.equal(first.readOnly, true);
  assert.equal(first.writes, false);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.summary.total, 2);
  assert.equal(first.summary.healthy, 1);
  assert.equal(first.summary.attention, 1);
});
