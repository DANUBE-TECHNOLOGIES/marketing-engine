"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  validate,
  PHONE_CONSENT_TEXT,
  PHONE_CONSENT_VERSION,
} = require("../src/routes/publicLeads");

function validBody(overrides = {}) {
  return {
    project: "leisure",
    source: "general",
    siteSlug: "ambassade-fram-mondescale-gien",
    name: "Client Test",
    phone: "0612345678",
    email: "client@example.test",
    destination: "Sicile",
    dates: "Octobre 2026",
    travellers: "2 adultes",
    phoneProjectContact: true,
    phoneConsentText: PHONE_CONSENT_TEXT,
    phoneConsentVersion: PHONE_CONSENT_VERSION,
    ...overrides,
  };
}

test("quote/contact lead requires explicit phone callback consent", () => {
  assert.deepEqual(validate(validBody({ phoneProjectContact: false })), {
    error: "PHONE_PROJECT_CONTACT_CONSENT_REQUIRED",
  });
});

test("quote/contact lead rejects altered consent wording or version", () => {
  assert.deepEqual(validate(validBody({ phoneConsentText: "Texte modifié" })), {
    error: "INVALID_PHONE_CONSENT_PROOF",
  });
  assert.deepEqual(validate(validBody({ phoneConsentVersion: "unknown" })), {
    error: "INVALID_PHONE_CONSENT_PROOF",
  });
});

test("quote/contact lead accepts exact explicit phone callback consent proof", () => {
  const result = validate(validBody());
  assert.ok(result.data);
  assert.equal(result.data.phoneProjectContact, true);
  assert.equal(result.data.phoneConsentText, PHONE_CONSENT_TEXT);
  assert.equal(result.data.phoneConsentVersion, PHONE_CONSENT_VERSION);
});
