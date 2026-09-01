"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ERP_LEAD_CONTRACT_VERSION,
  buildErpLeadIdempotencyKey,
  buildErpLeadPayload,
  buildErpLeadRequest,
} = require("../src/lib/erpLeadContract");

function lead(overrides = {}) {
  return {
    id: "lead_1234567890",
    agencyId: "agency_gien",
    siteSlug: "mondescale-gien",
    projectType: "leisure",
    source: "general",
    sourcePage: "/agence/mondescale-gien/inspiration/sicile",
    sourcePath: "/agence/mondescale-gien/demande-devis?source=general&utm_source=google",
    sourceReferrer: "https://www.google.com/",
    utmSource: "google",
    utmMedium: "organic",
    utmCampaign: "sicile",
    utmContent: "hero",
    utmTerm: "voyage sicile",
    name: "Client Test",
    phone: "0612345678",
    email: "CLIENT@EXAMPLE.TEST",
    destination: "Sicile",
    travelDates: "Mai 2027",
    travellers: "2 adultes",
    budget: "3000 EUR",
    wishes: "Hôtel proche de la mer",
    createdAt: "2026-09-01T10:00:00.000Z",
    ...overrides,
  };
}

test("111D maps a Marketing Engine lead to the versioned ERP contract", () => {
  const payload = buildErpLeadPayload(lead());
  assert.equal(payload.contractVersion, ERP_LEAD_CONTRACT_VERSION);
  assert.equal(payload.sourceSystem, "MARKETING_ENGINE");
  assert.equal(payload.sourceLeadId, "lead_1234567890");
  assert.deepEqual(payload.agency, {
    marketingEngineAgencyId: "agency_gien",
    siteSlug: "mondescale-gien",
  });
  assert.equal(payload.contact.email, "client@example.test");
  assert.equal(payload.project.type, "LEISURE");
  assert.equal(payload.attribution.utmSource, "google");
  assert.equal(payload.attribution.sourcePage, "/agence/mondescale-gien/inspiration/sicile");
});

test("111D maps group and business project types explicitly", () => {
  assert.equal(buildErpLeadPayload(lead({ projectType: "group" })).project.type, "GROUP");
  assert.equal(buildErpLeadPayload(lead({ projectType: "business" })).project.type, "BUSINESS");
});

test("111D idempotency is stable for a given Marketing Engine lead", () => {
  const first = buildErpLeadIdempotencyKey(lead());
  const second = buildErpLeadIdempotencyKey(lead({ destination: "Crète" }));
  assert.equal(first, second);
  assert.match(first, /^mse_[a-f0-9]{64}$/);
});

test("111D request descriptor carries contract and idempotency headers", () => {
  const request = buildErpLeadRequest(lead());
  assert.equal(request.method, "POST");
  assert.equal(request.headers["x-mondescale-contract-version"], ERP_LEAD_CONTRACT_VERSION);
  assert.equal(request.headers["idempotency-key"], buildErpLeadIdempotencyKey(lead()));
  assert.equal(request.payload.sourceLeadId, "lead_1234567890");
});

test("111D refuses an incomplete lead rather than generating an unsafe ERP payload", () => {
  assert.throws(() => buildErpLeadPayload(lead({ agencyId: null })), /AGENCY_ID_REQUIRED/);
  assert.throws(() => buildErpLeadPayload(lead({ email: "" })), /CONTACT_REQUIRED/);
});
