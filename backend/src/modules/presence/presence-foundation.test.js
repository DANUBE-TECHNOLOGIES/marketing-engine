"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildCanonicalAgencyIdentity } = require("./canonical-identity");
const { compareNap } = require("./nap-diff");
const { getPresenceProvider } = require("./provider-registry");
const { PRESENCE_PROVIDER_TYPES, PRESENCE_CAPABILITIES } = require("./presence-provider");

test("canonical identity normalizes existing Agency fields without persistence changes", () => {
  const identity = buildCanonicalAgencyIdentity({
    id: 7,
    tenantId: "tenant-1",
    name: "  Mondescale   Nevers ",
    address: "1 rue Exemple",
    postalCode: "58000",
    city: "Nevers",
    phone: "03 86 00 00 00",
    email: "AGENCE@EXAMPLE.FR",
    website: "mondescale.com/nevers/",
    googleLocationId: "locations/123"
  });

  assert.equal(identity.name, "Mondescale Nevers");
  assert.equal(identity.phone, "+33386000000");
  assert.equal(identity.email, "agence@example.fr");
  assert.equal(identity.website, "https://mondescale.com/nevers");
  assert.equal(identity.address.countryCode, "FR");
});

test("NAP diff ignores accents, casing, French phone formatting and trailing website slash", () => {
  const canonical = buildCanonicalAgencyIdentity({
    id: 1,
    name: "Agence Voyages Évasion",
    address: "10 Rue de Paris",
    postalCode: "75001",
    city: "Paris",
    phone: "01 42 00 00 00",
    email: "x@example.fr",
    website: "https://example.fr/"
  });

  const result = compareNap(canonical, {
    name: "agence voyages evasion",
    address: { street: "10 rue de paris", postalCode: "75001", city: "PARIS", countryCode: "FR" },
    phone: "+33 1 42 00 00 00",
    website: "https://example.fr"
  });

  assert.equal(result.match, true);
  assert.equal(result.score, 100);
  assert.deepEqual(result.drift, []);
});

test("NAP diff exposes deterministic drift", () => {
  const canonical = buildCanonicalAgencyIdentity({
    id: 2,
    name: "Mondescale",
    address: "1 rue A",
    postalCode: "45000",
    city: "Orléans",
    phone: "02 00 00 00 00",
    email: "x@example.fr",
    website: "https://example.fr"
  });

  const result = compareNap(canonical, {
    name: "Mondescale",
    address: { street: "1 rue A", postalCode: "45000", city: "Orléans", countryCode: "FR" },
    phone: "02 00 00 00 99",
    website: "https://old.example.fr"
  });

  assert.equal(result.match, false);
  assert.equal(result.score, 50);
  assert.deepEqual(result.drift, ["phone", "website"]);
});

test("provider registry distinguishes managed APIs from contribution and portal channels", () => {
  const google = getPresenceProvider("google_business_profile");
  const tomtom = getPresenceProvider("tomtom");
  const pagesJaunes = getPresenceProvider("pagesjaunes");

  assert.equal(google.type, PRESENCE_PROVIDER_TYPES.MANAGED_API);
  assert.ok(google.capabilities.includes(PRESENCE_CAPABILITIES.PUSH));
  assert.equal(tomtom.type, PRESENCE_PROVIDER_TYPES.CONTRIBUTION_API);
  assert.ok(tomtom.capabilities.includes(PRESENCE_CAPABILITIES.SUBMIT));
  assert.equal(pagesJaunes.type, PRESENCE_PROVIDER_TYPES.MANAGED_PORTAL);
  assert.equal(pagesJaunes.capabilities.includes(PRESENCE_CAPABILITIES.PUSH), false);
});