"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const legacy = require("../scripts/mse-25-30-post-rollout-validate");
const {
  isPublicSiteNotPublishedError,
  validateSite,
} = require("../src/modules/minisite-seo-enrichment/post-rollout-validator");

test("MSE-25.30 reconnaît explicitement PUBLIC_SITE_NOT_PUBLISHED", () => {
  assert.equal(isPublicSiteNotPublishedError({ code: "PUBLIC_SITE_NOT_PUBLISHED" }), true);
  assert.equal(isPublicSiteNotPublishedError({ code: "PUBLIC_SITE_NOT_FOUND" }), false);
});

test("MSE-25.30 valide un site draft historique par la persistance sans exiger son rendu public", async () => {
  const originalReadOnlyRequest = legacy.readOnlyRequest;
  legacy.readOnlyRequest = async (url) => {
    if (url.includes("/api/public-site-read/sites/tui-store-amilly")) {
      const error = new Error("Mini-site non publié.");
      error.code = "PUBLIC_SITE_NOT_PUBLISHED";
      throw error;
    }
    if (url.includes("/agencies/9/site/pages/home/blocks")) {
      return {
        payload: {
          published: true,
          status: "published",
          seoTitle: "Agence de voyages à Amilly | TUI STORE Amilly",
          blocks: [{
            id: "hero-1",
            blockType: "hero",
            content: { title: "Votre agence de voyages à Amilly" },
          }],
        },
      };
    }
    throw new Error(`Unexpected URL ${url}`);
  };

  try {
    const result = await validateSite({
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      agency: {
        agencyId: 9,
        siteSlug: "tui-store-amilly",
        pages: [{
          slug: "home",
          changed: true,
          expectedChanges: [
            { blockId: null, blockType: "page", field: "seoTitle", next: "Agence de voyages à Amilly | TUI STORE Amilly" },
            { blockId: "hero-1", blockType: "hero", field: "title", next: "Votre agence de voyages à Amilly" },
          ],
        }],
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.publiclyExpected, false);
    assert.equal(result.siteMode, "draft");
    assert.equal(result.readyToSubmit, false);
    assert.equal(result.pages.length, 1);
    assert.equal(result.pages[0].mode, "site-draft");
    assert.equal(result.pages[0].persistedProof.ok, true);
    assert.equal(result.pages[0].publicProof.skipped, true);
    assert.equal(result.pages[0].htmlProof.skipped, true);
  } finally {
    legacy.readOnlyRequest = originalReadOnlyRequest;
  }
});
