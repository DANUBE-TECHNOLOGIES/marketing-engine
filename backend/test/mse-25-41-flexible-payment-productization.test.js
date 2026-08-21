"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildPublicPaymentCopy,
  planPaymentPlacements,
  validatePaymentPolicyInput,
} = require("../src/modules/flexible-payment-experience");

test("MSE-25.41 defaults to a conversion-oriented CTA without inventing financing terms", () => {
  const copy = buildPublicPaymentCopy({ enabled: true, products: ["flight", "travel"] });
  assert.equal(copy.title, "Payez vos billets d’avion et vos voyages en plusieurs fois");
  assert.equal(copy.ctaLabel, "Étudier mes possibilités de paiement");
  assert.equal(copy.ctaMode, "contact");
  assert.doesNotMatch(copy.body, /\b[2-9]x\b|sans frais/);
  assert.match(copy.disclaimer, /Sous réserve/);
});

test("MSE-25.41 can route a payment lead to the quote journey", () => {
  const plan = planPaymentPlacements({
    policy: { enabled: true, products: ["flight"], ctaMode: "quote" },
    site: { pages: [{ slug: "home", status: "published", blocks: [] }] },
  });
  assert.equal(plan.proposals[0].block.content.primaryCta.href, "devis");
});

test("MSE-25.41 rejects unsupported CTA destinations", () => {
  assert.throws(
    () => validatePaymentPolicyInput({ enabled: true, products: ["travel"], ctaMode: "external-credit" }),
    (error) => error.code === "FLEXIBLE_PAYMENT_POLICY_INVALID_CTA_MODE"
  );
});

test("MSE-25.41 only states no-fee payment when explicitly configured", () => {
  const withFeesUnknown = buildPublicPaymentCopy({
    enabled: true,
    products: ["flight"],
    installmentCounts: [3, 4],
  });
  assert.doesNotMatch(withFeesUnknown.body, /sans frais/);

  const noFees = buildPublicPaymentCopy({
    enabled: true,
    products: ["flight"],
    installmentCounts: [3, 4],
    feeMode: "without-fees",
  });
  assert.match(noFees.body, /3x ou 4x sans frais/);
});
