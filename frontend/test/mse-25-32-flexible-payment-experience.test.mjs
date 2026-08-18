import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalog = fs.readFileSync(
  path.join(root, "lib/page-builder-v2/block-catalog.js"),
  "utf8"
);
const paymentApi = fs.readFileSync(
  path.join(root, "lib/page-builder-v2/flexible-payment-api.js"),
  "utf8"
);
const policyPanel = fs.readFileSync(
  path.join(root, "components/page-builder-v2/FlexiblePaymentPolicyPanel.js"),
  "utf8"
);
const editorPage = fs.readFileSync(
  path.join(root, "app/website-builder/editor/[siteId]/page.js"),
  "utf8"
);
const paymentProxy = fs.readFileSync(
  path.join(
    root,
    "app/api/agency-sites/[siteKey]/flexible-payment/[[...operation]]/route.js"
  ),
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

test("MSE-25.32 exposes persisted policy operations to Website Designer V2", () => {
  assert.match(paymentApi, /fetchFlexiblePaymentConfiguration/);
  assert.match(paymentApi, /previewFlexiblePayment/);
  assert.match(paymentApi, /saveFlexiblePaymentPolicy/);
  assert.match(paymentApi, /applyFlexiblePayment/);
  assert.match(paymentApi, /rollbackFlexiblePayment/);
  assert.match(paymentApi, /JSON\.stringify\(\{ confirm: true, policy \}\)/);
  assert.match(paymentApi, /previewFingerprint/);
});

test("MSE-25.32 proxies Website Designer payment calls to the backend", () => {
  assert.match(paymentProxy, /BACKEND_INTERNAL_URL/);
  assert.match(paymentProxy, /ALLOWED_OPERATIONS/);
  assert.match(paymentProxy, /"policy"/);
  assert.match(paymentProxy, /"preview"/);
  assert.match(paymentProxy, /"apply"/);
  assert.match(paymentProxy, /"rollback"/);
  assert.match(paymentProxy, /export function GET/);
  assert.match(paymentProxy, /export function POST/);
  assert.match(paymentProxy, /export function PUT/);
});

test("MSE-25.32 provides structured Website Designer controls for agency payment policy", () => {
  assert.match(policyPanel, /Paiement en plusieurs fois/);
  assert.match(policyPanel, /Billetterie aérienne/);
  assert.match(policyPanel, /Voyages et séjours/);
  assert.match(policyPanel, /Échéances autorisées/);
  assert.match(policyPanel, /value="without-fees"/);
  assert.match(policyPanel, /Disclaimer/);
  assert.match(policyPanel, /Libellé du CTA/);
  assert.match(policyPanel, /Prévisualiser/);
  assert.match(policyPanel, /Enregistrer la configuration/);
  assert.match(policyPanel, /Déployer les blocs/);
  assert.match(policyPanel, /applyFlexiblePayment/);
  assert.match(policyPanel, /preview\.fingerprint/);
  assert.match(policyPanel, /installmentDraft/);
});

test("MSE-25.32 mounts payment policy controls in the live Website Designer editor", () => {
  assert.match(editorPage, /FlexiblePaymentPolicyPanel/);
  assert.match(editorPage, /siteSlug=\{resolvedParams\.siteId\}/);
  assert.match(editorPage, /VisualPageBuilder/);
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
