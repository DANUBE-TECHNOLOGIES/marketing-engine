"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluateCitationObservation } = require("./citation-observation");

const agency = {
  id: 12,
  name: "Ambassade FRAM - Mondescale Nevers",
  address: "1 rue Exemple",
  postalCode: "58000",
  city: "Nevers",
  phone: "03 86 00 00 00",
  email: "nevers@example.fr",
  website: "https://agences.mondescale.com/nevers"
};

test("manual directory observation can prove a citation is in sync", () => {
  const result = evaluateCitationObservation({
    agency,
    providerKey: "pagesjaunes",
    observed: {
      name: "Ambassade FRAM - Mondescale Nevers",
      address: "1 rue Exemple",
      postalCode: "58000",
      city: "Nevers",
      phone: "+33 3 86 00 00 00",
      website: "https://agences.mondescale.com/nevers/"
    }
  });

  assert.equal(result.status, "in_sync");
  assert.equal(result.diff.score, 100);
  assert.equal(result.submissionMode, "manual");
});

test("manual directory observation exposes exact NAP drift", () => {
  const result = evaluateCitationObservation({
    agency,
    providerKey: "mappy",
    observed: {
      name: agency.name,
      address: agency.address,
      postalCode: agency.postalCode,
      city: agency.city,
      phone: "03 86 99 99 99",
      website: "https://old.example.fr"
    }
  });

  assert.equal(result.status, "drift_detected");
  assert.deepEqual(result.diff.drift, ["phone", "website"]);
  assert.equal(result.submissionMode, "manual");
});
