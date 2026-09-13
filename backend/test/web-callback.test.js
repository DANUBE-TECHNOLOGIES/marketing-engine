"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  CALLBACK_VERSION,
  CONSENT_VERSION,
  CALLBACK_WORDING,
  MARKETING_WORDING,
  buildConsentEvidence,
  validateCallback,
} = require("../src/modules/web-callback");

test("MSE-25.210 accepts an immediate callback without marketing opt-in", () => {
  const checked = validateCallback({
    firstName: "Marie",
    phone: "06 12 34 56 78",
    callbackMode: "asap",
    travelType: "circuit",
    marketingPhone: false,
  });
  assert.equal(checked.error, undefined);
  assert.equal(checked.data.callbackMode, "asap");
  assert.equal(checked.data.marketingPhone, false);
});

test("MSE-25.210 requires a valid slot for a scheduled callback", () => {
  const checked = validateCallback({
    firstName: "Marie",
    phone: "0612345678",
    callbackMode: "later",
    requestedDate: "2026-09-15",
    requestedSlot: "soir",
    travelType: "sejour",
  });
  assert.equal(checked.error, "INVALID_CALLBACK_SLOT");
});

test("MSE-25.210 rejects malformed phone numbers", () => {
  const checked = validateCallback({
    firstName: "Marie",
    phone: "123",
    callbackMode: "asap",
    travelType: "sejour",
  });
  assert.equal(checked.error, "INVALID_PHONE");
});

test("MSE-25.210 records callback request separately from future marketing consent", () => {
  const evidence = buildConsentEvidence({ marketingPhone: false }, "2026-09-13T08:00:00.000Z");
  assert.equal(evidence.version, CONSENT_VERSION);
  assert.equal(evidence.callbackRequest.granted, true);
  assert.equal(evidence.callbackRequest.wording, CALLBACK_WORDING);
  assert.equal(evidence.phoneMarketing.granted, false);
  assert.equal(evidence.phoneMarketing.wording, MARKETING_WORDING);
  assert.match(CALLBACK_VERSION, /^mse-25\.210-/);
});
