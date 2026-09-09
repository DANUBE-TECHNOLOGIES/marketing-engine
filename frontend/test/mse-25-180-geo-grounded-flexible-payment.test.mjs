import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/FlexiblePaymentRenderer.js"),
  "utf8",
);

test("MSE-25.180 payment copy stays grounded in configured facts", () => {
  assert.match(source, /Modalités publiées : règlement en/);
  assert.match(source, /Modalités de paiement publiées/);
  assert.doesNotMatch(source, /peut étudier avec vous une solution/i);
  assert.doesNotMatch(source, /peut vous proposer un règlement/i);
  assert.doesNotMatch(source, /adaptée à votre réservation/i);
  assert.doesNotMatch(source, /Payez vos billets d’avion et vos voyages/i);
});

test("MSE-25.180 installment claims require configured installment counts", () => {
  assert.match(source, /normalizeInstallmentCounts\(content\.installmentCounts\)/);
  assert.match(source, /if \(!counts\.length\) return null/);
  assert.match(source, /feeMode === "without-fees"/);
  assert.match(source, /feeMode === "with-fees"/);
});

test("MSE-25.180 payment CTA requires explicit label and href", () => {
  assert.match(source, /return label && href \? \{ label, href \} : null/);
  assert.doesNotMatch(source, /Étudier mes possibilités de paiement/);
  assert.doesNotMatch(source, /content\.ctaMode === "quote" \? "devis" : "contact"/);
});

test("MSE-25.180 empty payment sections do not manufacture content", () => {
  assert.match(source, /if \(!title && !body && !installmentText && !content\.disclaimer && !actionHref\) return null/);
  assert.doesNotMatch(source, /Facilités de paiement";/);
});
