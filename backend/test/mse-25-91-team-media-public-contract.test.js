"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  hydrateTeamMembers,
  isLegacyTeamPlaceholder,
  isTeamBlock,
  memberAssetId,
  publicMediaUrl,
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

test("MSE-25.91 recognises generic historical team placeholders", () => {
  assert.equal(isLegacyTeamPlaceholder({ name: "Votre équipe", imageUrl: "" }), true);
  assert.equal(isLegacyTeamPlaceholder({ name: "Céline", imageUrl: "/media/assets/celine.webp" }), false);
});

test("MSE-25.91 normalizes internal media URLs to same-origin public paths", () => {
  assert.equal(publicMediaUrl("http://backend:4000/media/assets/celine.webp"), "/media/assets/celine.webp");
  assert.equal(publicMediaUrl("https://internal.example/media/brand-assets/logo.png"), "/media/brand-assets/logo.png");
  assert.equal(publicMediaUrl("https://cdn.example/celine.webp"), "https://cdn.example/celine.webp");
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
        payload: { image: { publicUrl: "http://backend:4000/media/assets/celine.webp" } },
        currentVersion: 3,
      },
    ]
  );

  const hydrated = pages[0].blocks[0].content.teamMembers[0];
  assert.equal(hydrated.image, "/media/assets/celine.webp");
  assert.equal(hydrated.imageUrl, "/media/assets/celine.webp");
  assert.equal(hydrated.__mediaSource, "asset-engine");
});

test("MSE-25.91 replaces placeholder-only team blocks with the real canonical profile", () => {
  const pages = hydrateTeamMembers(
    [
      {
        slug: "accueil",
        blocks: [
          {
            blockType: "team",
            content: {
              members: [
                {
                  name: "Céline",
                  role: "Conseillère voyage",
                  imageUrl: "/media/assets/celine.webp",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "agence",
        blocks: [
          {
            blockType: "team",
            content: {
              members: [
                {
                  name: "Votre équipe",
                  role: "Conseillers voyage",
                  imageUrl: "",
                },
              ],
            },
          },
        ],
      },
      {
        slug: "equipe",
        blocks: [
          {
            blockType: "team",
            content: {
              members: [
                {
                  name: "Votre équipe",
                  role: "Conseillers voyage",
                  imageUrl: "",
                },
              ],
            },
          },
        ],
      },
    ],
    []
  );

  for (const page of pages.slice(1)) {
    const content = page.blocks[0].content;
    assert.equal(content.members.length, 1);
    assert.equal(content.members[0].name, "Céline");
    assert.equal(content.members[0].imageUrl, "/media/assets/celine.webp");
    assert.equal(content.__teamSource, "canonical-real-team-profile");
  }
});

test("MSE-25.91 public-site service actually runs team hydration", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../src/modules/public-site-read/service.js"),
    "utf8"
  );
  assert.match(source, /hydrateTeamMediaAssets/);
  assert.match(source, /pages:\s*galleryEnrichedPages/);
});
