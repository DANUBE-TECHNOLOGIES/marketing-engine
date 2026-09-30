const test = require("node:test");
const assert = require("node:assert/strict");

const {
  extractPlaceId,
  matchRankingTarget,
  isSameRankingTarget,
} = require("../src/lib/ranking-target-identity");

const OZOIR = {
  id: 5,
  name: "Ambassade FRAM - Mondescale - Ozoir-la-Ferrière",
  city: "Ozoir-la-Ferrière",
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=OZOIR_PLACE",
};

const NEVERS = {
  id: 6,
  name: "Ambassade FRAM - Mondescale - Nevers",
  city: "Nevers",
  googleReviewUrl:
    "https://search.google.com/local/writereview?placeid=NEVERS_PLACE",
};

test("extracts placeid from Google review URL", () => {
  assert.equal(
    extractPlaceId(OZOIR.googleReviewUrl),
    "OZOIR_PLACE"
  );
});

test("exact Ozoir Place ID matches Ozoir", () => {
  assert.equal(
    isSameRankingTarget({
      agency: OZOIR,
      result: {
        title: OZOIR.name,
        placeId: "OZOIR_PLACE",
      },
    }),
    true
  );
});

test("Nevers Place ID cannot satisfy Ozoir", () => {
  const match = matchRankingTarget({
    agency: OZOIR,
    result: {
      title: NEVERS.name,
      city: "Nevers",
      placeId: "NEVERS_PLACE",
    },
  });

  assert.equal(match.matched, false);
  assert.equal(match.method, "place_id");
});

test("Ozoir cannot satisfy Nevers", () => {
  assert.equal(
    isSameRankingTarget({
      agency: NEVERS,
      result: {
        title: OZOIR.name,
        city: "Ozoir-la-Ferrière",
        placeId: "OZOIR_PLACE",
      },
    }),
    false
  );
});

test("Mondescale brand alone is insufficient", () => {
  assert.equal(
    isSameRankingTarget({
      agency: OZOIR,
      result: {
        title: "Ambassade FRAM - Mondescale - Nevers",
        address: "58000 Nevers",
      },
    }),
    false
  );
});

test("legacy fallback accepts matching target name and city", () => {
  assert.equal(
    isSameRankingTarget({
      agency: OZOIR,
      result: {
        title: OZOIR.name,
        address: "77330 Ozoir-la-Ferrière",
      },
    }),
    true
  );
});
