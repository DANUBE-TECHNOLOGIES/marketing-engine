"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_NETWORK_POLICY,
  applyFlexiblePaymentNetworkPolicy,
  buildFlexiblePaymentNetworkPolicyPreview,
} = require("../src/modules/flexible-payment-experience/network-policy");

const sites = [
  { id: "site-a", slug: "agency-a", agencyId: 1, paymentPolicy: null },
  { id: "site-b", slug: "agency-b", agencyId: 2, paymentPolicy: { ...DEFAULT_NETWORK_POLICY } },
  { id: "site-c", slug: "agency-c", agencyId: 3, paymentPolicy: null },
];

test("MSE-25.41 proposes a safe flight + travel policy only for unconfigured sites", () => {
  const preview = buildFlexiblePaymentNetworkPolicyPreview(sites);
  assert.equal(preview.readOnly, true);
  assert.equal(preview.writes, false);
  assert.deepEqual(preview.policy.products, ["flight", "travel"]);
  assert.deepEqual(preview.policy.installmentCounts, []);
  assert.equal(preview.policy.feeMode, "unspecified");
  assert.equal(preview.policy.ctaMode, "contact");
  assert.equal(preview.policy.ctaLabel, "Étudier mes possibilités de paiement");
  assert.equal(preview.summary.configurable, 2);
  assert.equal(preview.summary.preserved, 1);
  assert.equal(preview.sites.find((row) => row.siteId === "site-b").action, "preserve");
  assert.match(preview.fingerprint, /^[a-f0-9]{64}$/);
});

test("MSE-25.41 refuses network policy writes without explicit confirmation", async () => {
  const preview = buildFlexiblePaymentNetworkPolicyPreview(sites);
  await assert.rejects(
    applyFlexiblePaymentNetworkPolicy({ upsert: async () => null }, {
      sites,
      siteIds: ["site-a"],
      previewFingerprint: preview.fingerprint,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_NETWORK_POLICY_CONFIRM_REQUIRED"
  );
});

test("MSE-25.41 preserves existing agency policies by default", async () => {
  const writes = [];
  const repository = {
    upsert: async (siteId, policy) => {
      writes.push({ siteId, policy });
      return policy;
    },
  };
  const preview = buildFlexiblePaymentNetworkPolicyPreview(sites);
  const result = await applyFlexiblePaymentNetworkPolicy(repository, {
    sites,
    siteIds: ["site-a", "site-b", "site-c"],
    previewFingerprint: preview.fingerprint,
    confirm: true,
  });

  assert.deepEqual(writes.map((row) => row.siteId), ["site-a", "site-c"]);
  assert.equal(result.summary.configuredSites, 2);
  assert.equal(result.summary.preservedSites, 1);
  assert.equal(result.preserved[0].siteId, "site-b");
});

test("MSE-25.41 requires a fresh fingerprint and explicit site selection", async () => {
  const repository = { upsert: async (_siteId, policy) => policy };
  const preview = buildFlexiblePaymentNetworkPolicyPreview(sites);

  await assert.rejects(
    applyFlexiblePaymentNetworkPolicy(repository, {
      sites,
      siteIds: ["site-a"],
      previewFingerprint: "stale",
      confirm: true,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_NETWORK_POLICY_PREVIEW_STALE"
  );

  await assert.rejects(
    applyFlexiblePaymentNetworkPolicy(repository, {
      sites,
      siteIds: [],
      previewFingerprint: preview.fingerprint,
      confirm: true,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_NETWORK_POLICY_SELECTION_REQUIRED"
  );
});
