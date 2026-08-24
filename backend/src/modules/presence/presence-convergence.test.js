"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  providerKeyForDirectory,
  enrichDirectoryWithProvider,
  legacySubmissionModeForProvider
} = require("./directory-bridge");
const { getPresenceProvider } = require("./provider-registry");
const { projectGooglePresence } = require("./google-listing-adapter");
const {
  normalizeLocationName,
  mapGoogleLocationToNap
} = require("./google-business-information");

test("legacy directory names resolve to presence providers", () => {
  assert.equal(providerKeyForDirectory({ name: "Google Business Profile" }), "google_business_profile");
  assert.equal(providerKeyForDirectory({ name: "PagesJaunes" }), "pagesjaunes");
  assert.equal(providerKeyForDirectory({ name: "Unknown" }), null);
});

test("legacy directories inherit provider capabilities without database changes", () => {
  const directory = enrichDirectoryWithProvider({ id: 1, name: "Apple Business Connect" });
  assert.equal(directory.providerKey, "apple_business_connect");
  assert.equal(directory.providerType, "managed_api");
  assert.equal(directory.managed, true);
  assert.equal(directory.requiresApproval, true);
  assert.ok(directory.capabilities.includes("push"));
});

test("legacy submission mode is derived from provider capability", () => {
  assert.equal(legacySubmissionModeForProvider(getPresenceProvider("google_business_profile")), "api");
  assert.equal(legacySubmissionModeForProvider(getPresenceProvider("tomtom")), "submission_api");
  assert.equal(legacySubmissionModeForProvider(getPresenceProvider("pagesjaunes")), "manual");
});

test("Google location resource names are normalized", () => {
  assert.equal(normalizeLocationName("locations/123"), "locations/123");
  assert.equal(normalizeLocationName("accounts/99/locations/123"), "locations/123");
  assert.equal(normalizeLocationName("123"), "locations/123");
});

test("Google Business Information response maps to canonical NAP shape", () => {
  assert.deepEqual(mapGoogleLocationToNap({
    name: "locations/123",
    title: "Mondescale Nevers",
    storefrontAddress: {
      addressLines: ["1 rue Exemple"],
      postalCode: "58000",
      locality: "Nevers",
      regionCode: "FR"
    },
    phoneNumbers: { primaryPhone: "+33386000000" },
    websiteUri: "https://agences.mondescale.com/nevers"
  }), {
    externalId: "locations/123",
    name: "Mondescale Nevers",
    address: {
      street: "1 rue Exemple",
      postalCode: "58000",
      city: "Nevers",
      countryCode: "FR"
    },
    phone: "+33386000000",
    website: "https://agences.mondescale.com/nevers"
  });
});

test("Google projection requires connection when no location id exists", async () => {
  const projection = await projectGooglePresence({}, { id: 8, name: "Mondescale Test" });
  assert.equal(projection.connected, false);
  assert.equal(projection.status, "connection_required");
  assert.equal(projection.diff, null);
});