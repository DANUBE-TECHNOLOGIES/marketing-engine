"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPublicPaymentCopy, normalizePaymentPolicy, planPaymentPlacements } = require("../src/modules/flexible-payment-experience");

test("normalizer keeps only explicit supported payment claims", () => {
  const policy = normalizePaymentPolicy({ enabled: true, products: ["flight", "flight", "travel", "unknown"], installmentCounts: [4, "3", 1, 25, 4, "bad"], feeMode: "without-fees" });
  assert.deepEqual(policy.products, ["flight", "travel"]); assert.deepEqual(policy.installmentCounts, [3, 4]); assert.equal(policy.feeMode, "without-fees");
});

test("generic public copy is commercial but never invents installment counts or no-fee claim", () => {
  const copy = buildPublicPaymentCopy({ enabled: true, products: ["flight"] });
  assert.equal(copy.title, "Payez vos billets d’avion en plusieurs fois"); assert.match(copy.body, /règlement échelonné/); assert.equal(copy.eyebrow, "Facilités de paiement"); assert.doesNotMatch(copy.body, /3x|4x|sans frais/);
});

test("explicit installment and no-fee claims can be rendered", () => {
  const copy = buildPublicPaymentCopy({ enabled: true, products: ["flight"], installmentCounts: [3, 4], feeMode: "without-fees" }); assert.match(copy.body, /3x ou 4x sans frais/);
});

test("planner targets home and flight pages, excludes drafts and duplicates", () => {
  const plan = planPaymentPlacements({ policy: { enabled: true, products: ["flight", "travel"] }, site: { pages: [
    { slug: "home", status: "published", blocks: [] }, { slug: "billetterie-et-vols", status: "published", blocks: [] }, { slug: "circuits", status: "published", blocks: [] },
    { slug: "vols", status: "published", blocks: [{ blockType: "flexible_payment", content: {} }] }, { slug: "billetterie", status: "draft", blocks: [] },
  ] } });
  assert.equal(plan.version, "mse-25.32"); assert.equal(plan.productVersion, "mse-25.41"); assert.equal(plan.readOnly, true); assert.equal(plan.writes, false);
  assert.deepEqual(plan.proposals.map(({ slug, placement }) => ({ slug, placement })), [{ slug: "home", placement: "compact" }, { slug: "billetterie-et-vols", placement: "enriched" }]);
  assert.ok(plan.skipped.some((item) => item.slug === "vols" && item.reason === "flexible-payment-block-already-present"));
  assert.ok(plan.skipped.some((item) => item.slug === "billetterie" && item.reason === "page-not-published"));
});

test("planner carries a conversion CTA into the public block", () => {
  const plan = planPaymentPlacements({ policy: { enabled: true, products: ["flight", "travel"], ctaLabel: "Étudier mon paiement" }, site: { pages: [{ slug: "home", status: "published", blocks: [] }] } });
  const content = plan.proposals[0].block.content; assert.equal(content.ctaLabel, "Étudier mon paiement"); assert.deepEqual(content.primaryCta, { href: "contact", label: "Étudier mon paiement" });
});

test("disabled policy produces no public proposals", () => {
  const plan = planPaymentPlacements({ policy: { enabled: false, products: ["flight"] }, site: { pages: [{ slug: "home", status: "published", blocks: [] }] } }); assert.equal(plan.enabled, false); assert.deepEqual(plan.proposals, []);
});

test("planner reconciles an owned stale payment block and becomes idempotent once synchronized", () => {
  const policy = {
    enabled: true,
    products: ["flight", "travel"],
    installmentCounts: [3, 4, 10],
    feeMode: "unspecified",
    ctaMode: "contact",
    ctaLabel: "Étudier mes possibilités de paiement",
  };

  const staleBlock = {
    id: "payment-home",
    blockType: "flexible_payment",
    content: {
      variant: "compact",
      title: "Vos billets d’avion et vos voyages, payables en plusieurs fois",
      body: "Ancien contenu",
      disclaimer:
        "Selon votre réservation et sous réserve des conditions applicables. Renseignez-vous auprès de votre agence.",
      ctaLabel: "Étudier mes possibilités de paiement",
      products: ["flight", "travel"],
      installmentCounts: [],
      feeMode: "unspecified",
    },
    seo: {
      source: "mse-25.32",
      purpose: "flexible-payment-experience",
    },
  };

  const first = planPaymentPlacements({
    policy,
    site: {
      pages: [
        {
          slug: "home",
          status: "published",
          blocks: [staleBlock],
        },
      ],
    },
  });

  assert.equal(first.proposals.length, 1);
  assert.equal(first.proposals[0].operation, "update");
  assert.equal(first.proposals[0].blockId, "payment-home");
  assert.deepEqual(
    first.proposals[0].block.content.installmentCounts,
    [3, 4, 10]
  );
  assert.match(
    first.proposals[0].block.content.body,
    /3x, 4x ou 10x/
  );

  const synchronizedBlock = {
    ...staleBlock,
    content: first.proposals[0].block.content,
  };

  const second = planPaymentPlacements({
    policy,
    site: {
      pages: [
        {
          slug: "home",
          status: "published",
          blocks: [synchronizedBlock],
        },
      ],
    },
  });

  assert.equal(second.proposals.length, 0);
  assert.ok(
    second.skipped.some(
      (item) =>
        item.slug === "home" &&
        item.reason ===
          "flexible-payment-block-already-synchronized"
    )
  );
});
