"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  NETWORK_AGENCIES,
  buildConsentEvidence,
  getFunnel,
  scoreSubmission,
  validateSubmission,
} = require("../src/modules/acquisition-funnel");

const HOT = {
  name: "Test Réseau",
  email: "reseau@example.test",
  postalCode: "75001",
  phone: "0612345678",
  consents: { phoneProjectContact: true, emailMarketing: false },
  answers: {
    departureWindow: "decembre",
    travellers: "2",
    budgetPerPerson: "5000-plus",
    travelStyle: "plage",
    departureAirport: "paris",
    maturity: "reservation-prochaine",
  },
};

const WARM = {
  answers: {
    departureWindow: "janvier",
    travellers: "2",
    budgetPerPerson: "2000-3000",
    travelStyle: "circuit",
    departureAirport: "paris",
    maturity: "comparaison",
  },
  consents: { phoneProjectContact: false, emailMarketing: false },
};

const COLD = {
  answers: {
    departureWindow: "pas-encore-decide",
    travellers: "1",
    budgetPerPerson: "a-definir",
    travelStyle: "a-decouvrir",
    departureAirport: "a-definir",
    maturity: "idees",
  },
  consents: { phoneProjectContact: false, emailMarketing: false },
};

test("MSE-25.209 keeps scoring deterministic across the network", () => {
  assert.deepEqual(scoreSubmission(HOT), {
    score: 100,
    temperature: "HOT",
    recommendedAction: "CONTACT_PRIORITY",
    reasons: ["reservation-prochaine", "budget:5000-plus", "periode-definie", "depart-defini", "style-defini", "rappel-demande"],
  });
  assert.equal(scoreSubmission(WARM).score, 62);
  assert.equal(scoreSubmission(WARM).temperature, "WARM");
  assert.equal(scoreSubmission(COLD).score, 11);
  assert.equal(scoreSubmission(COLD).temperature, "COLD");
});

test("MSE-25.209 requires explicit phone consent when a phone is supplied", () => {
  for (const agency of NETWORK_AGENCIES) {
    const funnel = getFunnel(agency.publicSiteSlug, "soleil-hiver");
    assert.equal(validateSubmission(funnel, HOT), null);
    assert.equal(validateSubmission(funnel, {
      ...HOT,
      consents: { ...HOT.consents, phoneProjectContact: false },
    }), "PHONE_CONSENT_REQUIRED");
  }
});

test("MSE-25.209 stores channel-specific consent evidence", () => {
  const evidence = buildConsentEvidence(
    { emailMarketing: true, phoneProjectContact: true },
    {
      funnelId: "gien-soleil-hiver",
      siteSlug: "ambassade-fram-mondescale-gien",
      phone: "0612345678",
      capturedAt: "2026-09-13T08:00:00.000Z",
    }
  );
  assert.equal(evidence.emailMarketing, true);
  assert.equal(evidence.phoneProjectContact, true);
  assert.equal(evidence.phoneProvided, true);
  assert.equal(evidence.funnelId, "gien-soleil-hiver");
  assert.match(evidence.wording.phoneProjectContact, /téléphone/);
  assert.match(evidence.wording.emailMarketing, /e-mail/);
});
