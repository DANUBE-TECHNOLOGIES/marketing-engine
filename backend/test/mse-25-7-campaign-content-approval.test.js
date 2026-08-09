"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CampaignService } = require("../src/modules/campaign-manager/service");
const CampaignRepository = require("../src/modules/campaign-manager/repository");

function campaignRepo() {
  const calls = [];

  return {
    calls,
    list: async () => [],
    get: async id => ({
      id,
      tasks: [],
      agencies: [],
      destinations: [],
      assets: [],
    }),
    getAsset: async () => ({
      id: "asset-1",
      campaignId: "campaign-1",
      type: "seo-content",
      channel: "article",
      status: "review",
      title: "Maurice en hiver",
      payload: {
        seoContentId: "content-1",
      },
      metadata: {},
    }),
    updateAssetReview: async (asset, data, decision) => {
      calls.push({ asset, data, decision });
      return { ...asset, ...data };
    },
  };
}

test("MSE-25.7 l'approbation Campaign Manager délègue la publication du SeoContent lié", async () => {
  const repo = campaignRepo();
  const service = new CampaignService(repo, "tenant_mondescale");

  const result = await service.approveAsset(
    "campaign-1",
    "asset-1",
    { reviewedBy: "Nicolas" }
  );

  assert.equal(result.status, "approved");
  assert.equal(repo.calls.length, 1);
  assert.equal(repo.calls[0].asset.payload.seoContentId, "content-1");
  assert.equal(repo.calls[0].decision.status, "approved");
});

test("MSE-25.7 synchronise l'approbation dans une transaction tenant-safe", async () => {
  let capturedWhere = null;
  let capturedData = null;

  const prisma = {
    $transaction: async callback => callback({
      campaignAsset: {
        update: async ({ where, data }) => ({
          id: where.id,
          type: "seo-content",
          payload: { seoContentId: "content-1" },
          ...data,
        }),
      },
      seoContent: {
        updateMany: async ({ where, data }) => {
          capturedWhere = where;
          capturedData = data;
          return { count: 1 };
        },
      },
    }),
  };

  const repo = new CampaignRepository(
    prisma,
    "tenant_mondescale"
  );

  await repo.updateAssetReview(
    {
      id: "asset-1",
      type: "seo-content",
      payload: { seoContentId: "content-1" },
    },
    { status: "approved", metadata: {} },
    { status: "approved" }
  );

  assert.deepEqual(capturedWhere, {
    id: "content-1",
    tenantId: "tenant_mondescale",
  });
  assert.equal(capturedData.status, "published");
  assert.ok(capturedData.publishedAt instanceof Date);
});

test("MSE-25.7 rejeter un asset seo-content retire le contenu du catalogue publié", async () => {
  let capturedData = null;

  const prisma = {
    $transaction: async callback => callback({
      campaignAsset: {
        update: async ({ where, data }) => ({
          id: where.id,
          ...data,
        }),
      },
      seoContent: {
        updateMany: async ({ data }) => {
          capturedData = data;
          return { count: 1 };
        },
      },
    }),
  };

  const repo = new CampaignRepository(
    prisma,
    "tenant_mondescale"
  );

  await repo.updateAssetReview(
    {
      id: "asset-1",
      type: "seo-content",
      payload: { seoContentId: "content-1" },
    },
    { status: "rejected", metadata: {} },
    { status: "rejected" }
  );

  assert.deepEqual(capturedData, {
    status: "rejected",
  });
});

test("MSE-25.7 annule l'approbation si le SeoContent lié n'appartient pas au tenant", async () => {
  const prisma = {
    $transaction: async callback => callback({
      campaignAsset: {
        update: async ({ where, data }) => ({ id: where.id, ...data }),
      },
      seoContent: {
        updateMany: async () => ({ count: 0 }),
      },
    }),
  };

  const repo = new CampaignRepository(
    prisma,
    "tenant_mondescale"
  );

  await assert.rejects(
    () => repo.updateAssetReview(
      {
        id: "asset-1",
        type: "seo-content",
        payload: { seoContentId: "foreign-content" },
      },
      { status: "approved", metadata: {} },
      { status: "approved" }
    ),
    error =>
      error.code === "CAMPAIGN_SEO_CONTENT_LINK_INVALID" &&
      error.statusCode === 409
  );
});

test("MSE-25.7 refuse un asset seo-content sans référence SeoContent", async () => {
  const repo = new CampaignRepository(
    {
      $transaction: async () => {
        throw new Error("La transaction ne doit pas démarrer.");
      },
    },
    "tenant_mondescale"
  );

  await assert.rejects(
    () => repo.updateAssetReview(
      {
        id: "asset-1",
        type: "seo-content",
        payload: {},
      },
      { status: "approved", metadata: {} },
      { status: "approved" }
    ),
    error =>
      error.code === "CAMPAIGN_SEO_CONTENT_LINK_REQUIRED" &&
      error.statusCode === 409
  );
});
