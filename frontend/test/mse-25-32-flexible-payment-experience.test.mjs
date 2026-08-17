import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalog = fs.readFileSync(
  path.join(root, "lib/page-builder-v2/block-catalog.js"),
  "utf8"
);
const registry = fs.readFileSync(
  path.join(root, "components/public-site/renderers/registry.js"),
  "utf8"
);
const renderer = fs.readFileSync(
  path.join(
    root,
    "components/public-site/renderers/FlexiblePaymentRenderer.js"
  ),
  "utf8"
);

test("MSE-25.32 exposes flexible payment in Website Designer V2", () => {
  assert.match(catalog, /type: "flexible_payment"/);
  assert.match(catalog, /label: "Paiement en plusieurs fois"/);
  assert.match(catalog, /feeMode: "unspecified"/);
  assert.match(catalog, /installmentCounts: \[\]/);
});

test("MSE-25.32 registers flexible payment in the public renderer", () => {
  assert.match(registry, /FlexiblePaymentRenderer/);
  assert.match(registry, /flexible_payment: FlexiblePaymentRenderer/);
  assert.match(registry, /"flexible-payment": FlexiblePaymentRenderer/);
});

test("MSE-25.32 public renderer keeps financial claims guarded", () => {
  assert.match(renderer, /item >= 2/);
  assert.match(renderer, /item <= 24/);
  assert.match(renderer, /feeMode === "without-fees"/);
  assert.match(renderer, /règlement échelonné peut être disponible/);
  assert.match(renderer, /Contacter mon agence/);
});

test("MSE-25.32 supports compact and enriched public variants", () => {
  assert.match(renderer, /content\.variant === "compact"/);
  assert.match(renderer, /data-payment-variant=\{variant\}/);
  assert.match(renderer, /Souplesse de règlement/);
});
