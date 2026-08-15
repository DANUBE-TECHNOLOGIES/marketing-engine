"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSite } = require("../scripts/mse-25-30-post-rollout-validate");

test("post-rollout refuse une page modifiée sans expectedChanges exploitables", async () => {
  const previousFetch = global.fetch;
  global.fetch = async (url) => {
    const isPublic = String(url).includes("/api/public-site-read/");
    const body = isPublic
      ? {
          pages: [{
            slug: "circuits",
            published: true,
            contentSource: "website-designer-v2-blocks",
            blocks: [{ id: 12, blockType: "hero", content: { title: "Circuits à Gien" } }],
          }],
        }
      : {
          readyToSubmit: true,
          entryCount: 1,
          entries: [{ siteSlug: "gien", url: "https://agences.mondescale.com/agence/gien/circuits" }],
          readiness: { readyToSubmit: true },
        };
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => body,
    };
  };

  try {
    const result = await validateSite({
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      agency: {
        agencyId: 1,
        siteSlug: "gien",
        pages: [{ slug: "circuits", changed: true }],
      },
    });
    assert.equal(result.readyToSubmit, true);
    assert.equal(result.pages[0].sitemapPresent, true);
    assert.equal(result.pages[0].expectedChangesPresent, false);
    assert.equal(result.pages[0].ok, false);
    assert.equal(result.ok, false);
  } finally {
    global.fetch = previousFetch;
  }
});
