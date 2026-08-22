"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  destinationAssetId,
  destinationMediaReferences,
  hydrateDestinationItems,
} = require("../src/modules/public-site-read/destination-media-hydrator");

const {
  hydrateDestinationBlocks,
} = require("../src/modules/public-site-read/dynamic-block-hydrator");

const {
  memberAssetId,
  teamMediaReferences,
  hydrateTeamMembers,
} = require("../src/modules/public-site-read/team-media-hydrator");

function imageAsset(id, url) {
  return {
    id,
    title: `Media ${id}`,
    currentVersion: 2,
    payload: {
      url,
      altText: `Alt ${id}`,
    },
  };
}

test("MSE-25.42 hydrates destinations collection used by the public renderer", () => {
  const pages = [{
    slug: "home",
    blocks: [{
      blockType: "destinations",
      content: {
        destinations: [
          { id: "maurice", title: "Île Maurice", imageAssetId: "asset-maurice" },
        ],
        items: [
          { id: "maurice", title: "Île Maurice", imageAssetId: "asset-maurice" },
        ],
      },
    }],
  }];

  assert.deepEqual(destinationMediaReferences(pages), ["asset-maurice"]);

  const hydrated = hydrateDestinationItems(
    pages,
    [imageAsset("asset-maurice", "https://cdn.example/maurice.webp")]
  );

  const content = hydrated[0].blocks[0].content;
  assert.equal(content.destinations[0].imageUrl, "https://cdn.example/maurice.webp");
  assert.equal(content.items[0].imageUrl, "https://cdn.example/maurice.webp");
});

test("MSE-25.42 preserves V2 media references while refreshing dynamic destination data", () => {
  const pages = [{
    blocks: [{
      blockType: "destinations",
      content: {
        source: "automatic",
        selectionMode: "automatic",
        limit: 6,
        items: [{
          id: "destination-maurice",
          slug: "ile-maurice",
          title: "Île Maurice",
          imageAssetId: "asset-maurice",
          imageAlt: "Plage à l’Île Maurice",
        }],
      },
    }],
  }];

  const refreshed = hydrateDestinationBlocks(pages, [], [{
    id: "destination-maurice",
    slug: "ile-maurice",
    name: "Île Maurice",
    country: "Maurice",
    summary: "Séjours et circuits à Maurice",
    heroImageUrl: null,
  }]);

  const item = refreshed[0].blocks[0].content.destinations[0];
  assert.equal(item.imageAssetId, "asset-maurice");
  assert.equal(item.imageAlt, "Plage à l’Île Maurice");
  assert.equal(item.description, "Séjours et circuits à Maurice");
  assert.equal(refreshed[0].blocks[0].content.items[0].imageAssetId, "asset-maurice");
});

test("MSE-25.42 keeps an existing destination URL without requiring an asset", () => {
  const pages = [{
    blocks: [{
      blockType: "destinations",
      content: {
        destinations: [{ title: "Seychelles", heroImageUrl: "https://cdn.example/seychelles.webp" }],
      },
    }],
  }];

  const hydrated = hydrateDestinationItems(pages, []);
  assert.equal(hydrated[0].blocks[0].content.destinations[0].image, "https://cdn.example/seychelles.webp");
  assert.equal(hydrated[0].blocks[0].content.destinations[0].imageUrl, "https://cdn.example/seychelles.webp");
});

test("MSE-25.42 recognizes compatible destination asset aliases", () => {
  assert.equal(destinationAssetId({ heroImageAssetId: "hero-1" }), "hero-1");
  assert.equal(destinationAssetId({ media: { assetId: "media-1" } }), "media-1");
});

test("MSE-25.42 hydrates team photo aliases in all public collections", () => {
  const pages = [{
    blocks: [{
      blockType: "team",
      content: {
        members: [{ name: "Céline", photoAssetId: "celine-photo" }],
        items: [{ name: "Céline", avatarAssetId: "celine-photo" }],
      },
    }],
  }];

  assert.deepEqual(teamMediaReferences(pages), ["celine-photo"]);

  const hydrated = hydrateTeamMembers(
    pages,
    [imageAsset("celine-photo", "https://cdn.example/celine.webp")]
  );

  const content = hydrated[0].blocks[0].content;
  assert.equal(content.members[0].imageUrl, "https://cdn.example/celine.webp");
  assert.equal(content.items[0].imageUrl, "https://cdn.example/celine.webp");
  assert.equal(content.members[0].imageAlt, "Alt celine-photo");
});

test("MSE-25.42 recognizes nested team asset references and preserves direct URLs", () => {
  assert.equal(memberAssetId({ photo: { assetId: "nested-photo" } }), "nested-photo");

  const pages = [{
    blocks: [{
      blockType: "team",
      content: {
        members: [{ name: "Céline", photoUrl: "https://cdn.example/direct-celine.webp" }],
      },
    }],
  }];

  const hydrated = hydrateTeamMembers(pages, []);
  assert.equal(hydrated[0].blocks[0].content.members[0].imageUrl, "https://cdn.example/direct-celine.webp");
});
