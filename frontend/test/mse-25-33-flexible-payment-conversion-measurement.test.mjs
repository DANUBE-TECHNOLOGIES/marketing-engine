import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const trackedLink = fs.readFileSync(
  path.join(root, "components/public-site/TrackedConversionLink.js"),
  "utf8"
);
const renderer = fs.readFileSync(
  path.join(root, "components/public-site/renderers/FlexiblePaymentRenderer.js"),
  "utf8"
);

test("MSE-25.33 exposes a provider-neutral conversion event contract", () => {
  assert.match(trackedLink, /event: "mondescale_conversion"/);
  assert.match(trackedLink, /conversion_type/);
  assert.match(trackedLink, /site_id/);
  assert.match(trackedLink, /site_slug/);
  assert.match(trackedLink, /payment_variant/);
  assert.match(trackedLink, /payment_products/);
  assert.match(trackedLink, /payment_installments/);
  assert.match(trackedLink, /payment_fee_mode/);
  assert.match(trackedLink, /cta_label/);
});

test("MSE-25.33 publishes to dataLayer and a browser CustomEvent", () => {
  assert.match(trackedLink, /window\.dataLayer\.push\(payload\)/);
  assert.match(trackedLink, /new CustomEvent\("mondescale:conversion"/);
  assert.match(trackedLink, /detail: payload/);
});

test("MSE-25.33 tracking remains navigation-safe", () => {
  assert.doesNotMatch(trackedLink, /preventDefault/);
  assert.match(trackedLink, /Analytics must never block public navigation/);
  assert.match(trackedLink, /href=\{href\}/);
});

test("MSE-25.33 flexible payment CTA uses the tracked link with non-PII context", () => {
  assert.match(renderer, /TrackedConversionLink/);
  assert.match(renderer, /conversionType: "flexible_payment_cta"/);
  assert.match(renderer, /siteId: site\?\.id/);
  assert.match(renderer, /siteSlug: site\?\.slug/);
  assert.match(renderer, /paymentVariant: variant/);
  assert.match(renderer, /paymentProducts: content\.products/);
  assert.match(renderer, /paymentInstallments: installmentCounts/);
  assert.match(renderer, /paymentFeeMode: feeMode/);
  assert.doesNotMatch(renderer, /email|phone|customer|sessionId/i);
});
