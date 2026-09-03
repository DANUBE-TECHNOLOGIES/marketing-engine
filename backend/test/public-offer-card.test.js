"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeOfferPrice,
  toPublicOfferCard,
} = require("../src/modules/campaign-manager/public-offer-card");

test("public offer mapper rejects recognized offer types without commercial content", () => {
  assert.equal(
    toPublicOfferCard({
      id: "promotion-empty",
      campaignId: "campaign-1",
      type: "promotion",
      title: "Promotion Sicile",
      payload: {},
    }),
    null
  );
});

test("public offer mapper accepts a recognized offer with meaningful content", () => {
  assert.deepEqual(
    toPublicOfferCard({
      id: "promotion-1",
      campaignId: "campaign-1",
      type: "promotion",
      title: "Promotion Sicile",
      payload: {
        description: "Autotour 8 jours",
        price: "1 490",
        currency: "€",
      },
    }),
    {
      id: "promotion-1",
      campaignId: "campaign-1",
      title: "Promotion Sicile",
      description: "Autotour 8 jours",
      image: null,
      badge: null,
      price: "1 490 €",
      href: null,
    }
  );
});

test("price normalization never duplicates the currency", () => {
  assert.equal(
    normalizeOfferPrice({ price: "1 490", currency: "€" }),
    "1 490 €"
  );

  assert.equal(
    normalizeOfferPrice({ price: "1 490 €", currency: "€" }),
    "1 490 €"
  );
});
