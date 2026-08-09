"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const ContentGenerationRepository = require("../src/modules/content-generation/repository");
const {
  offerCard,
  loadApprovedCampaignOffers,
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

test("offerCard rejects generic campaign content without offer semantics", () => {
  assert.equal(
    offerCard({
      id: "generic-1",
      type: "landing-page",
      title: "Sicile",
      payload: { generated: true },
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

test("approved campaign offers are tenant and agency scoped", async () => {
  let capturedWhere = null;

  const prisma = {
    campaignAsset: {
      findMany: async ({ where }) => {
        capturedWhere = where;
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

  assert.deepEqual(capturedWhere.id.in, ["offer-a", "offer-b"]);
  assert.equal(capturedWhere.status, "approved");
  assert.equal(capturedWhere.campaign.tenantId, "tenant-1");
  assert.equal(capturedWhere.campaign.agencies.some.agencyId, 42);
});

test("V2 offer order and limit survive public hydration", async () => {
  const prisma = {
    campaignAsset: {
      findMany: async () => [
        {
          id: "offer-a",
          campaignId: "campaign-1",
          type: "offer",
          title: "Offre A",
          payload: { price: "1000 €" },
        },
        {
          id: "offer-b",
          campaignId: "campaign-1",
          type: "offer",
          title: "Offre B",
          payload: { price: "1200 €" },
        },
        {
          id: "generic",
          campaignId: "campaign-1",
          type: "landing-page",
          title: "Landing",
          payload: { generated: true },
        },
      ],
    },
  };

  const pages = await hydratePublicDynamicBlocks({
    prisma,
    tenantId: "tenant-1",
    agencyId: 42,
    pages: [
      {
        id: "page-1",
        blocks: [
          {
            id: "block-1",
            type: "offers",
            status: "published",
            content: {
              offerIds: ["offer-b", "generic", "offer-a"],
              limit: 2,
            },
          },
        ],
      },
    ],
  });

  const offers = pages[0].blocks[0].content.offers;

  assert.deepEqual(
    offers.map((offer) => offer.id),
    ["offer-b", "offer-a"]
  );
});
