"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { recordCitationObservation } = require("./citation-recording");

function prismaMock() {
  const stored = [];
  const observations = [];
  return {
    stored,
    observations,
    $executeRaw: async (strings, ...values) => {
      observations.push({ strings: Array.from(strings), values });
      return 1;
    },
    localDirectory: {
      findUnique: async ({ where }) => where.name === "PagesJaunes"
        ? { id: 4, name: "PagesJaunes" }
        : null
    },
    directoryListing: {
      findUnique: async () => null,
      create: async ({ data }) => ({ id: 90, ...data, listingUrl: null }),
      update: async ({ where, data }) => {
        const row = { id: where.id, ...data };
        stored.push(row);
        return row;
      }
    }
  };
}

const agency = {
  id: 7,
  name: "Mondescale Nevers",
  address: "1 rue Exemple",
  postalCode: "58000",
  city: "Nevers",
  phone: "03 86 00 00 00",
  email: "nevers@example.fr",
  website: "https://agences.mondescale.com/nevers"
};

test("recording a monitored citation updates only Local Engine state", async () => {
  const prisma = prismaMock();
  const response = await recordCitationObservation(prisma, {
    agency,
    providerKey: "pagesjaunes",
    listingUrl: "https://www.pagesjaunes.fr/pros/example",
    observed: {
      name: agency.name,
      address: agency.address,
      postalCode: agency.postalCode,
      city: agency.city,
      phone: agency.phone,
      website: agency.website
    }
  });

  assert.equal(response.result.status, "in_sync");
  assert.equal(response.listing.status, "validated");
  assert.equal(response.listing.nameCorrect, true);
  assert.equal(response.listing.addressCorrect, true);
  assert.equal(response.listing.phoneCorrect, true);
  assert.equal(response.listing.websiteCorrect, true);
  assert.equal(response.listing.listingUrl, "https://www.pagesjaunes.fr/pros/example");
  assert.equal(prisma.observations.length, 1);
});
