"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildSameAs,
} = require("../src/modules/minisite-structured-data/travel-agency");

test("MSE-25.8 keeps only valid HTTP(S) sameAs URLs", () => {
  const result = buildSameAs(
    {
      brandProfiles: [
        {
          facebookUrl: "0",
          instagramUrl: "https://www.instagram.com/mondescale.dax",
          linkedinUrl: "javascript:alert(1)",
          youtubeUrl: "https://www.youtube.com/@mondescale",
        },
      ],
    },
    {
      sameAs: [
        "1",
        "https://www.facebook.com/mondescale.dax",
        "https://www.facebook.com/mondescale.dax",
      ],
    }
  );

  assert.deepEqual(result, [
    "https://www.facebook.com/mondescale.dax",
    "https://www.instagram.com/mondescale.dax",
    "https://www.youtube.com/@mondescale",
  ]);
});
