"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ContentGenerationRepository = require("../src/modules/content-generation/repository");
const { CampaignService } = require("../src/modules/campaign-manager/service");
const {
  OFFER_ASSET_TYPES,
  normalizeOfferPrice,
} = require("../src/modules/campaign-manager/public-offer-card");
const {
  offerCard,
  automaticCampaignOfferLimit,
  loadApprovedCampaignOffers,
  hydrateOfferBlocks,
  hydratePublicDynamicBlocks,
} = require("../src/modules/public-site-read/dynamic-block-hydrator");

test("generated assets delegate to task-scoped upsert", async () => {
  const repo = new ContentGenerationRepository({}, "tenant-1");
  let received = null;

  repo.upsertAssetForTask = async (taskId, data) => {
    received = { taskId, data };
    return { id: "asset-1", taskId, ...data };
  };

  const result = await repo.upsertAsset({
    taskId: "task-1",
    campaignId: "campaign-1",
    type: "offer",
    payload: { price: "999 €" },
  });

  assert.equal(received.taskId, "task-1");
  assert.equal(received.data.campaignId, "campaign-1");
  assert.equal(received.data.taskId, undefined);
  assert.equal(result.id, "asset-1");
});

test("shared offer mapper rejects non-offer campaign assets", () => {
  assert.equal(
    offerCard({
      id: "generic-1",
      type: "landing-page",
      title: "Sicile",
      payload: {
        price: "1490 €",
        imageUrl: "https://cdn.example/sicile.jpg",
      },
    }),
    null
  );

  assert.deepEqual(
    offerCard({
      id: "offer-1",
      campaignId: "campaign-1",
      type: "offer",
      title: "Sicile en liberté",
      payload: {
        price: 1490,
        currency: "€",
        imageUrl: "https://cdn.example/sicile.jpg",
        href: "https://example.com/sicile",
        badge: "Coup de cœur",
      },
    }),
    {
      id: "offer-1",
      campaignId: "campaign-1",
      title: "Sicile en liberté",
      description: null,
      image: "https://cdn.example/sicile.jpg",
      badge: "Coup de cœur",
      price: "1490 €",
      href: "https://example.com/sicile",
    }
  );
});

test("shared offer price mapper preserves currency for text prices", () => {
  assert.equal(
    normalizeOfferPrice({ price: "1 490", currency: "€" }),
    "1 490 €"
  );
  assert.equal(
    normalizeOfferPrice({ price: "1 490 €", currency: "€" }),
    "1 490 €"
  );
});

test("approved campaign offers are tenant, agency, status and type scoped", async () => {
  let captured = null;

  const prisma = {
    campaignAsset: {
      findMany: async (query) => {
        captured = query;
        return [];
      },
    },
  };

  await loadApprovedCampaignOffers({
    prisma,
    tenantId: "tenant-1",
    agencyId: "42",
    references: ["offer-a", "offer-b"],
  });

  assert.deepEqual(captured.where.id.in, ["offer-a", "offer-b"]);
  assert.equal(captured.where.status, "approved");
  assert.deepEqual(captured.where.type.in, [...OFFER_ASSET_TYPES]);
  assert.equal(captured.where.campaign.tenantId, "tenant-1");
  assert.equal(captured.where.campaign.agencies.some.agencyId, 42);
  assert.equal(captured.take, 2);
});

test("editor offer catalog is tenant-scoped and hides raw payloads", async () => {
  let requestedAgencyId = null;

  const repo = {
    list() {},
    countAgencies: async (ids) => {
      requestedAgencyId = ids[0];
      return 1;
    },
    listApprovedSiteOffers: async () => [
      {
        id: "offer-1",
        campaignId: "campaign-1",
        type: "offer",
        title: "Sicile",
        payload: {
          price: "999",
          currency: "€",
          internalPrompt: "must-not-leak",
        },
      },
    ],
  };

  const service = new CampaignService(repo, "tenant-1");
  const items = await service.listApprovedOfferOptions("42", 6);

  assert.equal(requestedAgencyId, 42);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Sicile");
  assert.equal(items[0].price, "999 €");
  assert.equal(items[0].payload, undefined);
  assert.equal(items[0].internalPrompt, undefined);
});

test("editor offer catalog rejects agencies outside the tenant", async () => {
  const repo = {
    list() {},
    countAgencies: async () => 0,
  };

  const service = new CampaignService(repo, "tenant-1");

  await assert.rejects(
    () => service.listApprovedOfferOptions("42", 6),
    (error) => error.code === "CAMPAIGN_OFFER_AGENCY_NOT_FOUND"
  );
});

test("V2 manual offer order and limit survive public hydration", async () => {
  let captured = null;
  const prisma = {
    campaignAsset: {
      findMany: async (query) => {
        captured = query;
        return [
          { id: "offer-a", campaignId: "campaign-1", type: "offer", title: "Offre A", payload: { price: "1000 €" } },
          { id: "offer-b", campaignId: "campaign-1", type: "offer", title: "Offre B", payload: { price: "1200 €" } },
        ];
      },
    },
  };

  const pages = await hydratePublicDynamicBlocks({
    prisma,
    tenantId: "tenant-1",
    agencyId: 42,
    pages: [{
      id: "page-1",
      blocks: [{
        id: "block-1",
        type: "offers",
        status: "published",
        content: { source: "manual", offerIds: ["offer-b", "generic", "offer-a"], limit: 2 },
      }],
    }],
  });

  assert.deepEqual(captured.where.type.in, [...OFFER_ASSET_TYPES]);
  assert.deepEqual(
    pages[0].blocks[0].content.offers.map((offer) => offer.id),
    ["offer-b", "offer-a"]
  );
});

test("campaign mode uses latest approved offer feed and respects limit", async () => {
  let captured = null;

  const prisma = {
    campaignAsset: {
      findMany: async (query) => {
        captured = query;
        return [
          { id: "latest", campaignId: "campaign-2", type: "promotion", title: "Dernière minute Sicile", payload: { price: "899 €" } },
          { id: "older", campaignId: "campaign-1", type: "offer", title: "Crète", payload: { price: "1099 €" } },
        ];
      },
    },
  };

  const pages = await hydratePublicDynamicBlocks({
    prisma,
    tenantId: "tenant-1",
    agencyId: 42,
    pages: [{
      id: "page-1",
      blocks: [{
        id: "campaign-offers",
        type: "offers",
        status: "published",
        content: { source: "campaign", offerIds: [], limit: 1 },
      }],
    }],
  });

  assert.equal(automaticCampaignOfferLimit([{ blocks: [{ type: "offers", content: { source: "campaign", limit: 1 } }] }]), 1);
  assert.equal(captured.where.id, undefined);
  assert.equal(captured.where.status, "approved");
  assert.deepEqual(captured.where.type.in, [...OFFER_ASSET_TYPES]);
  assert.deepEqual(captured.orderBy, [{ updatedAt: "desc" }, { createdAt: "desc" }]);
  assert.equal(captured.take, 1);
  assert.deepEqual(pages[0].blocks[0].content.offers.map((offer) => offer.id), ["latest"]);
});

test("manual and automatic offer feeds remain isolated", () => {
  const pages = hydrateOfferBlocks(
    [{
      id: "page-1",
      blocks: [
        { id: "manual", type: "offers", content: { source: "manual", offerIds: ["manual-1"], limit: 6 } },
        { id: "auto", type: "offers", content: { source: "campaign", offerIds: [], limit: 6 } },
      ],
    }],
    [{ id: "manual-1", campaignId: "campaign-manual", type: "offer", title: "Manuelle", payload: { price: "700 €" } }],
    [{ id: "auto-1", campaignId: "campaign-auto", type: "offer", title: "Automatique", payload: { price: "800 €" } }]
  );

  assert.deepEqual(pages[0].blocks[0].content.offers.map((offer) => offer.id), ["manual-1"]);
  assert.deepEqual(pages[0].blocks[1].content.offers.map((offer) => offer.id), ["auto-1"]);
});
