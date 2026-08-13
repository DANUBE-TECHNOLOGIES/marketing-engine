"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  imageTextMediaReferences,
  hydrateImageTextBlocks,
} = require("../src/modules/public-site-read/image-text-media-hydrator");

test("collecte les références Asset Engine des blocs image_text", () => {
  const references = imageTextMediaReferences([
    {
      blocks: [
        {
          type: "image_text",
          content: {
            imageAssetId: "asset-image-text-1",
          },
        },
        {
          type: "hero",
          content: {
            imageAssetId: "asset-hero-ignore",
          },
        },
      ],
    },
  ]);

  assert.deepEqual(references, ["asset-image-text-1"]);
});

test("hydrate image_text depuis un MEDIA_IMAGE publié", () => {
  const pages = hydrateImageTextBlocks(
    [
      {
        id: "home",
        blocks: [
          {
            id: "image-text",
            type: "image_text",
            content: {
              title: "Votre projet",
              imageAssetId: "asset-image-text-1",
              imageUrl: null,
              imageAlt: "",
            },
          },
        ],
      },
    ],
    [
      {
        id: "asset-image-text-1",
        title: "Conseil voyage",
        currentVersion: 4,
        payload: {
          url: "/media/assets/test/image.jpg",
          altText: "Conseillère préparant un voyage",
        },
      },
    ]
  );

  const content = pages[0].blocks[0].content;

  assert.equal(content.imageAssetId, "asset-image-text-1");
  assert.equal(content.imageUrl, "/media/assets/test/image.jpg");
  assert.equal(content.imageAlt, "Conseillère préparant un voyage");
  assert.equal(content.__mediaSource, "asset-engine");
  assert.equal(content.__mediaVersion, 4);
});
