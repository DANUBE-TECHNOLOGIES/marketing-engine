import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const band = readFileSync(new URL("../components/public-site/PublicReassuranceBand.js", import.meta.url), "utf8");
const resolver = readFileSync(new URL("../../backend/src/modules/public-brand-legal/resolver.js", import.meta.url), "utf8");

test("MSE-25.157 payment claims use explicit public settings authority", () => {
  assert.match(resolver, /"settings"/);
  assert.match(band, /settings\.paymentMethods/);
  assert.match(band, /normalizedPaymentMethods/);
});

test("MSE-25.157 no payment brand is hardcoded as accepted", () => {
  assert.doesNotMatch(band, /const PAYMENT_METHODS/);
  assert.doesNotMatch(band, /Visa_2021/);
  assert.doesNotMatch(band, /Mastercard-logo/);
  assert.doesNotMatch(band, /American_Express_logo/);
  assert.doesNotMatch(band, /Moyens de paiement acceptés/);
});

test("MSE-25.157 payment panel is omitted without configured methods", () => {
  assert.match(band, /const hasPayments = paymentMethods\.length > 0/);
  assert.match(band, /\{hasPayments \? \(/);
  assert.match(band, /hasPayments && hasTrust/);
  assert.match(band, /Moyens de paiement publiés/);
});
