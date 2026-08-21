"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPublicPaymentCopy, planPaymentPlacements } = require("../src/modules/flexible-payment-experience");

test("MSE-25.41 uses conversion-oriented public copy without inventing financing terms", () => {
  const copy = buildPublicPaymentCopy({ enabled: true, products: ["flight", "travel"] });
  assert.equal(copy.title, "Payez vos billets d’avion et vos voyages en plusieurs fois");
  assert.equal(copy.ctaLabel, "Étudier mes possibilités de paiement");
  assert.doesNotMatch(copy.body, /\b[2-9]x\b|sans frais/);
  assert.match(copy.disclaimer, /Sous réserve/);
});

test("MSE-25.41 preserves explicit agency CTA labels while routing to contact", () => {
  const plan = planPaymentPlacements({
    policy: { enabled: true, products: ["flight"], ctaLabel: "Demander une étude personnalisée" },
    site: { pages: [{ slug: "home", status: "published", blocks: [] }] },
  });
  assert.equal(plan.productVersion, "mse-25.41");
  assert.deepEqual(plan.proposals[0].block.content.primaryCta, { href: "contact", label: "Demander une étude personnalisée" });
});

test("MSE-25.41 only states no-fee payment when explicitly configured", () => {
  const unknownFees = buildPublicPaymentCopy({ enabled: true, products: ["flight"], installmentCounts: [3, 4] });
  assert.doesNotMatch(unknownFees.body, /sans frais/);
  const noFees = buildPublicPaymentCopy({ enabled: true, products: ["flight"], installmentCounts: [3, 4], feeMode: "without-fees" });
  assert.match(noFees.body, /3x ou 4x sans frais/);
});

test("MSE-25.41 differentiates flight-only and travel-only public promises", () => {
  assert.equal(buildPublicPaymentCopy({ enabled: true, products: ["flight"] }).title, "Payez vos billets d’avion en plusieurs fois");
  assert.equal(buildPublicPaymentCopy({ enabled: true, products: ["travel"] }).title, "Payez votre voyage en plusieurs fois");
});
