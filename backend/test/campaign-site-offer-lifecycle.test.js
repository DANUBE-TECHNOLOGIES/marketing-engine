"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  validateOfferAssetInput,
  normalizeHref,
} = require("../src/modules/campaign-manager/offer-asset");
const {
  CampaignService,
} = require("../src/modules/campaign-manager/service");

test("site offer contract normalizes publishable content", () => {
  const result = validateOfferAssetInput({
    title: "  Sicile en liberté  ",
    description: "Autotour 8 jours",
    price: 1490,
    currency: "€",
    imageUrl: "https://cdn.example/sicile.jpg",
    href: "/sicile",
    badge: "Coup de cœur",
  });

  assert.equal(result.title, "Sicile en liberté");
  assert.equal(result.payload.price, 1490);
  assert.equal(result.payload.currency, "€");
  assert.equal(result.payload.href, "/sicile");
});

test("site offer contract rejects empty commercial content", () => {
  assert.throws(
    () => validateOfferAssetInput({ title: "Sicile" }),
    (error) => error.code === "CAMPAIGN_OFFER_CONTENT_REQUIRED"
  );
});

test("site offer contract rejects dangerous href protocols", () => {
  assert.throws(
    () => normalizeHref("javascript:alert(1)"),
    (error) => error.code === "CAMPAIGN_OFFER_HREF_INVALID"
  );
});

test("campaign offer creation starts in review", async () => {
  let created = null;

  const repo = {
    list() {},
    get: async (id) => ({
      id,
      name: "Campagne été",
      tasks: [],
      agencies: [],
      destinations: [],
    }),
    createAsset: async (data) => {
      created = data;
      return { id: "asset-1", ...data };
    },
  };

  const service = new CampaignService(repo, "tenant-1");

  const asset = await service.createOfferAsset("campaign-1", {
    title: "Sicile",
    price: "1490 €",
    href: "https://example.com/sicile",
  });

  assert.equal(created.campaignId, "campaign-1");
  assert.equal(created.type, "offer");
  assert.equal(created.channel, "site");
  assert.equal(created.status, "review");
  assert.equal(asset.payload.price, "1490 €");
});

test("approval validates offer payload before changing status", async () => {
  let updated = false;

  const repo = {
    list() {},
    get: async (id) => ({
      id,
      name: "Campagne été",
      tasks: [],
      agencies: [],
      destinations: [],
    }),
    getAsset: async () => ({
      id: "asset-invalid",
      campaignId: "campaign-1",
      type: "offer",
      status: "review",
      title: "Offre incomplète",
      payload: {},
      metadata: {},
    }),
    updateAsset: async () => {
      updated = true;
      return {};
    },
  };

  const service = new CampaignService(repo, "tenant-1");

  await assert.rejects(
    () => service.approveAsset(
      "campaign-1",
      "asset-invalid",
      { reviewedBy: "Nicolas" }
    ),
    (error) => error.code === "CAMPAIGN_OFFER_CONTENT_REQUIRED"
  );

  assert.equal(updated, false);
});
