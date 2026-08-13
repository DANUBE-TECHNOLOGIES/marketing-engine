"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  heroAssetReferences,
  loadPublishedHeroAssets,
  hydrateHeroMediaAssets,
} = require("../src/modules/public-site-read/section-aware-service");

test("collecte les imageAssetId des Hero sans doublon", () => {
  const references = heroAssetReferences([
    {
      blocks: [
        {
          type: "hero",
          content: { imageAssetId: "asset-1" },
        },
        {
          blockType: "hero",
          content: { imageAssetId: "asset-1" },
        },
        {
          type: "hero",
          content: { imageAssetId: "asset-2" },
        },
      ],
    },
  ]);

  assert.deepEqual(references, ["asset-1", "asset-2"]);
});

test("charge uniquement les MEDIA_IMAGE publiés du tenant", async () => {
  let receivedWhere = null;
  const prisma = {
    asset: {
      async findMany(query) {
        receivedWhere = query.where;
        return [];
      },
    },
  };

  await loadPublishedHeroAssets({
    prisma,
    tenantId: "tenant_mondescale",
    references: ["asset-1"],
  });

  assert.deepEqual(receivedWhere, {
    tenantId: "tenant_mondescale",
    id: { in: ["asset-1"] },
    type: "MEDIA_IMAGE",
    status: "published",
    deletedAt: null,
  });
});

test("hydrate le Hero depuis Asset Engine et rend l'Asset prioritaire", () => {
  const pages = hydrateHeroMediaAssets(
    [
      {
        id: "home",
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            blockType: "hero",
            content: {
              title: "Mondescale",
              imageAssetId: "asset-1",
              imageUrl: "https://legacy.example/hero.jpg",
              imageAlt: "Ancien alt",
            },
          },
        ],
      },
    ],
    [
      {
        id: "asset-1",
        title: "Hero premium réseau Mondescale",
        currentVersion: 5,
        payload: {
          url: "https://images.example/hero-premium.jpg",
          altText: "Plage tropicale et lagon turquoise",
        },
      },
    ]
  );

  const content = pages[0].blocks[0].content;
  assert.equal(content.imageAssetId, "asset-1");
  assert.equal(content.imageUrl, "https://images.example/hero-premium.jpg");
  assert.equal(content.imageAlt, "Plage tropicale et lagon turquoise");
  assert.equal(content.__mediaSource, "asset-engine");
  assert.equal(content.__mediaVersion, 5);
});

test("conserve le Hero existant quand l'Asset n'est pas résolu", () => {
  const original = {
    id: "hero-1",
    type: "hero",
    content: {
      imageAssetId: "missing-asset",
      imageUrl: "https://legacy.example/hero.jpg",
    },
  };

  const pages = hydrateHeroMediaAssets(
    [{ id: "home", blocks: [original] }],
    []
  );

  assert.deepEqual(pages[0].blocks[0], original);
});
