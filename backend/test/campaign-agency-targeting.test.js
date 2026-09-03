"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { CampaignService } = require("../src/modules/campaign-manager/service");

test("campaign agency options are delegated to tenant repository", async () => {
  const repo = {
    list() {},
    listAgencies: async () => [
      { id: 1, name: "Bois-Colombes", city: "Bois-Colombes" },
      { id: 2, name: "Maurepas", city: "Maurepas" },
    ],
  };

  const service = new CampaignService(repo, "tenant-1");
  const agencies = await service.listAgencyOptions();

  assert.deepEqual(agencies.map((agency) => agency.id), [1, 2]);
});

test("approved offer options reject an agency outside tenant", async () => {
  const repo = {
    list() {},
    countAgencies: async () => 0,
  };

  const service = new CampaignService(repo, "tenant-1");

  await assert.rejects(
    () => service.listApprovedOfferOptions(999, 6),
    (error) => error.code === "CAMPAIGN_OFFER_AGENCY_NOT_FOUND"
  );
});

test("approved offer options map only safe public fields", async () => {
  const repo = {
    list() {},
    countAgencies: async () => 1,
    listApprovedSiteOffers: async () => [
      {
        id: "offer-1",
        campaignId: "campaign-1",
        type: "offer",
        title: "Sicile",
        payload: {
          price: "1 490",
          currency: "€",
          imageUrl: "https://cdn.example/sicile.jpg",
          internalPrompt: "secret",
        },
      },
    ],
  };

  const service = new CampaignService(repo, "tenant-1");
  const [offer] = await service.listApprovedOfferOptions(1, 6);

  assert.equal(offer.price, "1 490 €");
  assert.equal(offer.image, "https://cdn.example/sicile.jpg");
  assert.equal(offer.payload, undefined);
  assert.equal(offer.internalPrompt, undefined);
});
