"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TravelCoreService,
  parseLimit,
  requireSearchQuery,
} = require("../src/modules/travel-core");

test("parseLimit applique les limites", () => {
  assert.equal(parseLimit(undefined), 100);
  assert.equal(parseLimit("25"), 25);
  assert.equal(parseLimit("999", 100, 500), 500);
});

test("requireSearchQuery refuse une recherche trop courte", () => {
  assert.throws(() => requireSearchQuery("a"), {
    code: "INVALID_SEARCH_QUERY",
  });
});

test("TravelCoreService retourne une recherche unifiée", async () => {
  const repository = {
    search: async () => ({
      countries: [
        { id: "country-1", slug: "maurice", name: "Maurice", continent: "Afrique" },
      ],
      regions: [],
      cities: [],
      destinations: [
        {
          id: "destination-1",
          slug: "ile-maurice",
          name: "Île Maurice",
          country: "Maurice",
          countryRef: { name: "Maurice" },
          regionRef: null,
          cityRef: null,
        },
      ],
    }),
  };

  const service = new TravelCoreService(repository);
  const result = await service.search({ q: "Maurice" });

  assert.equal(result.count, 2);
  assert.equal(result.byType.country, 1);
  assert.equal(result.byType.destination, 1);
  assert.equal(result.items[0].type, "country");
});

test("TravelCoreService signale une destination absente", async () => {
  const service = new TravelCoreService({
    findDestination: async () => null,
  });

  await assert.rejects(
    () => service.getDestination("inconnue"),
    { code: "DESTINATION_NOT_FOUND" }
  );
});
