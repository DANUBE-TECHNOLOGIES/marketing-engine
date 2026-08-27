"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildGoogleRemediationPatch } = require("./google-remediation");

const agency = {
  id: 7,
  name: "Ambassade FRAM - Mondescale Nevers",
  address: "1 rue Exemple",
  postalCode: "58000",
  city: "Nevers",
  phone: "03 86 00 00 00",
  email: "nevers@example.fr",
  website: "https://agences.mondescale.com/nevers",
  googleLocationId: "locations/123"
};

test("Google remediation only patches requested NAP fields", () => {
  const patch = buildGoogleRemediationPatch(agency, ["phone", "website"]);
  assert.deepEqual(patch.updateMask, ["phoneNumbers", "websiteUri"]);
  assert.deepEqual(patch.body, {
    phoneNumbers: { primaryPhone: "+33386000000" },
    websiteUri: "https://agences.mondescale.com/nevers"
  });
  assert.equal(patch.risk.level, "standard");
  assert.equal(patch.risk.requiresSensitiveConfirmation, false);
});

test("Google remediation maps canonical address and flags identity-sensitive edits", () => {
  const patch = buildGoogleRemediationPatch(agency, ["address", "name"]);
  assert.deepEqual(patch.updateMask, ["storefrontAddress", "title"]);
  assert.equal(patch.body.storefrontAddress.locality, "Nevers");
  assert.equal(patch.body.storefrontAddress.postalCode, "58000");
  assert.deepEqual(patch.body.storefrontAddress.addressLines, ["1 rue Exemple"]);
  assert.equal(patch.risk.level, "high");
  assert.deepEqual(patch.risk.sensitiveFields, ["address", "name"]);
  assert.equal(patch.risk.requiresSensitiveConfirmation, true);
});
