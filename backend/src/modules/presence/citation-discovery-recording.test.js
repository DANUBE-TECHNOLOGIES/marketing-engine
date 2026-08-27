"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { recordDiscoveredCitation } = require("./citation-discovery-recording");

function prismaMock() {
  let updated = null;
  return {
    get updated() { return updated; },
    localDirectory: {
      findUnique: async ({ where }) => where.name === "PagesJaunes"
        ? { id: 4, name: "PagesJaunes" }
        : null
    },
    directoryListing: {
      findUnique: async () => null,
      create: async ({ data }) => ({ id: 44, ...data, listingUrl: null }),
      update: async ({ where, data }) => {
        updated = { id: where.id, ...data };
        return updated;
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
  email: "nevers@example.fr"
};

test("discovered URL remains pending until a NAP observation validates it", async () => {
  const prisma = prismaMock();
  const listing = await recordDiscoveredCitation(prisma, {
    agency,
    providerKey: "pagesjaunes",
    candidate: {
      url: "https://www.pagesjaunes.fr/pros/123",
      score: 100
    }
  });

  assert.equal(listing.status, "pending");
  assert.equal(listing.listingUrl, "https://www.pagesjaunes.fr/pros/123");
  assert.match(listing.notes, /Validation NAP requise/);
  assert.equal(Object.hasOwn(listing, "nameCorrect"), false);
});
