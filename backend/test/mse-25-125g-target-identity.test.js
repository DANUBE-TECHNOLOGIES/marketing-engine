"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  placeIdFromGoogleReviewUrl,
  createDataForSeoProvider,
} = require("../src/modules/ranking-grid/routes");

test("placeIdFromGoogleReviewUrl extracts supported Google place id parameters", () => {
  assert.equal(
    placeIdFromGoogleReviewUrl("https://search.google.com/local/writereview?placeid=ChIJm9AWNIxl5kcRrz3SLs3mauo"),
    "ChIJm9AWNIxl5kcRrz3SLs3mauo"
  );
  assert.equal(
    placeIdFromGoogleReviewUrl("https://www.google.com/maps/search/?api=1&query=voyage&query_place_id=ChIJabc_DEF-123"),
    "ChIJabc_DEF-123"
  );
  assert.equal(placeIdFromGoogleReviewUrl(""), null);
  assert.equal(placeIdFromGoogleReviewUrl(null), null);
});

test("provider target prefers profile placeId over review URL fallback", async () => {
  const prisma = {
    agency: {
      findUnique: async () => ({
        name: "Mondescale Bois-Colombes",
        address: "41 Rue des Bourguignons",
        postalCode: "92270",
        website: "https://www.mondescale.com/",
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJreview",
        profile: { googleLocationData: { placeId: "ChIJprofile", cid: "123" } },
      }),
    },
  };

  const provider = createDataForSeoProvider(prisma);
  const target = await provider.targetResolver(6);
  assert.equal(target.placeId, "ChIJprofile");
  assert.equal(target.cid, "123");
});

test("provider target falls back to Agency.googleReviewUrl placeId", async () => {
  const prisma = {
    agency: {
      findUnique: async () => ({
        name: "Ambassade FRAM - Mondescale Bois-Colombes",
        address: "41 Rue des Bourguignons",
        postalCode: "92270",
        website: "https://www.mondescale.com/",
        googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJm9AWNIxl5kcRrz3SLs3mauo",
        profile: { googleLocationData: { name: "locations/4257347512580641383" } },
      }),
    },
  };

  const provider = createDataForSeoProvider(prisma);
  const target = await provider.targetResolver(6);
  assert.equal(target.placeId, "ChIJm9AWNIxl5kcRrz3SLs3mauo");
  assert.equal(target.name, "Ambassade FRAM - Mondescale Bois-Colombes");
});
