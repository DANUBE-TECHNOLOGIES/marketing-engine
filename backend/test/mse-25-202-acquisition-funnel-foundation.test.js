"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DisabledErpConnector,
  buildConsentEvidence,
  buildErpLeadEnvelope,
  getFunnel,
  scoreSubmission
} = require("../src/modules/acquisition-funnel");

test("MSE-25.202 exposes the Bois-Colombes soleil-hiver pilot", () => {
  const funnel = getFunnel("bois-colombes", "soleil-hiver");
  assert.ok(funnel);
  assert.equal(funnel.siteSlug, "bois-colombes");
  assert.equal(funnel.questions.length, 6);
  assert.equal(funnel.contact.optional.includes("phone"), true);
});

test("a mature high-value project requesting a callback is HOT", () => {
  const result = scoreSubmission({
    phone: "01 23 45 67 89",
    consents: { phoneProjectContact: true },
    answers: {
      maturity: "reservation-prochaine",
      budgetPerPerson: "3000-5000",
      departureWindow: "fevrier",
      departureAirport: "paris",
      travelStyle: ["plage"]
    }
  });

  assert.equal(result.temperature, "HOT");
  assert.equal(result.recommendedAction, "CONTACT_PRIORITY");
  assert.ok(result.score >= 70);
  assert.ok(result.reasons.includes("rappel-demande"));
});

test("an early inspiration lead remains eligible for nurture", () => {
  const result = scoreSubmission({
    answers: {
      maturity: "idees",
      budgetPerPerson: "a-definir",
      departureWindow: "pas-encore-decide",
      departureAirport: "a-definir",
      travelStyle: ["a-decouvrir"]
    }
  });

  assert.equal(result.temperature, "COLD");
  assert.equal(result.recommendedAction, "NURTURE");
});

test("phone consent is separate from email marketing consent", () => {
  const evidence = buildConsentEvidence(
    { emailMarketing: false, phoneProjectContact: true },
    {
      funnelId: "bois-colombes-soleil-hiver",
      siteSlug: "bois-colombes",
      phone: "0123456789",
      capturedAt: "2026-09-11T18:00:00.000Z"
    }
  );

  assert.equal(evidence.emailMarketing, false);
  assert.equal(evidence.phoneProjectContact, true);
  assert.equal(evidence.phoneProvided, true);
  assert.equal(evidence.capturedAt, "2026-09-11T18:00:00.000Z");
});

test("ERP envelope is stable while connector remains disabled", async () => {
  const funnel = getFunnel("bois-colombes", "soleil-hiver");
  const submission = {
    name: "Client Test",
    email: "client@example.test",
    postalCode: "92270",
    phone: "0123456789",
    answers: { maturity: "reservation-prochaine" }
  };
  const qualification = scoreSubmission(submission);
  const consentEvidence = buildConsentEvidence(
    { phoneProjectContact: true },
    { funnelId: funnel.id, siteSlug: funnel.siteSlug, phone: submission.phone }
  );
  const envelope = buildErpLeadEnvelope({
    leadId: "lead_test",
    funnel,
    submission,
    qualification,
    consentEvidence
  });

  assert.equal(envelope.schemaVersion, "mondescale.acquisition-lead.v1");
  assert.equal(envelope.agency.siteSlug, "bois-colombes");

  const connector = new DisabledErpConnector();
  const result = await connector.publish(envelope);
  assert.deepEqual(result, {
    status: "DISABLED",
    externalId: null,
    schemaVersion: "mondescale.acquisition-lead.v1"
  });
});
