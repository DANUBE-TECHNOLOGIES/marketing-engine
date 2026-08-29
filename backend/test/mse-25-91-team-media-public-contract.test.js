"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  hydrateTeamMembers,
  isTeamBlock,
  memberAssetId,
  teamCollections,
} = require("../src/modules/public-site-read/team-media-hydrator");

test("MSE-25.91 recognises every public team renderer variant", () => {
  for (const type of ["team", "equipe", "team-grid", "equipe-grid"]) {
    assert.equal(isTeamBlock({ blockType: type }), true, type);
  }
});

test("MSE-25.91 recognises legacy teamMembers collections", () => {
  assert.deepEqual(teamCollections({ teamMembers: [{ name: "Céline" }] }), ["teamMembers"]);
});

test("MSE-25.91 resolves team asset ids and exposes a real image URL", () => {
  const member = {
    name: "Céline",
    portraitAsset: { id: "asset-celine" },
  };
  assert.equal(memberAssetId(member), "asset-celine");

  const pages = hydrateTeamMembers(
    [
      {
        slug: "equipe",
        blocks: [
          {
            blockType: "equipe-grid",
            content: { teamMembers: [member] },
          },
        ],
      },
    ],
    [
      {
        id: "asset-celine",
        title: "Portrait Céline",
        type: "image",
        status: "draft",
        payload: { image: { publicUrl: "/media/celine.webp" } },
        currentVersion: 3,
      },
    ]
  );

  const hydrated = pages[0].blocks[0].content.teamMembers[0];
  assert.equal(hydrated.image, "/media/celine.webp");
  assert.equal(hydrated.imageUrl, "/media/celine.webp");
  assert.equal(hydrated.__mediaSource, "asset-engine");
});

test("MSE-25.91 public-site service actually runs team hydration", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/modules/public-site-read/service.js"),
    "utf8"
  );
  assert.match(source, /hydrateTeamMediaAssets/);
  assert.match(source, /pages:\s*galleryEnrichedPages/);
});
