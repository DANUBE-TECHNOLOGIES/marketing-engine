"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSite } = require("../scripts/mse-25-30-post-rollout-validate");

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => body,
  };
}

function htmlResponse(html) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => "text/html; charset=utf-8" },
    text: async () => html,
  };
}

test("post-rollout accepte une page légale explicitement noindex si elle reste publique et noindex", async () => {
  const previousFetch = global.fetch;
  const canonicalUrl = "https://agences.mondescale.com/agence/gien/mentions-legales";
  const page = {
    slug: "mentions-legales",
    published: true,
    status: "published",
    contentSource: "website-designer-v2-blocks",
    blocks: [{ id: 12, blockType: "hero", content: { title: "Informations légales à Gien" } }],
  };

  global.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl === canonicalUrl) {
      return htmlResponse(`<!doctype html><html><head><link rel="canonical" href="${canonicalUrl}" /><meta name="robots" content="noindex,follow" /></head><body><h1>Mentions légales</h1></body></html>`);
    }
    if (requestUrl.includes("/api/public-site-read/")) return jsonResponse({ pages: [page] });
    if (requestUrl.includes("/agencies/1/site/pages/mentions-legales/blocks")) return jsonResponse(page);
    return jsonResponse({ readyToSubmit: true, entryCount: 0, entries: [], readiness: { readyToSubmit: true } });
  };

  try {
    const result = await validateSite({
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      publicOrigin: "https://agences.mondescale.com",
      sitemapExcluded: [{ type: "page", siteSlug: "gien", pageSlug: "mentions-legales", reason: "noindex-page" }],
      agency: {
        agencyId: 1,
        siteSlug: "gien",
        pages: [{
          slug: "mentions-legales",
          changed: true,
          expectedChanges: [{ blockId: 12, blockType: "hero", field: "title", next: "Informations légales à Gien" }],
        }],
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.pages[0].mode, "noindex");
    assert.equal(result.pages[0].sitemapPresent, false);
    assert.equal(result.pages[0].htmlProof.expectedIndexable, false);
    assert.equal(result.pages[0].htmlProof.indexabilityOk, true);
  } finally {
    global.fetch = previousFetch;
  }
});

test("post-rollout accepte une draft uniquement si la version V2 est correcte et reste non publique", async () => {
  const previousFetch = global.fetch;
  const persistedPage = {
    slug: "nouvelle-page",
    published: false,
    status: "draft",
    blocks: [{ id: 21, blockType: "hero", content: { title: "Projet de voyage à Gien" } }],
  };

  global.fetch = async (url) => {
    const requestUrl = String(url);
    if (requestUrl.includes("/api/public-site-read/")) return jsonResponse({ pages: [] });
    if (requestUrl.includes("/agencies/1/site/pages/nouvelle-page/blocks")) return jsonResponse(persistedPage);
    return jsonResponse({ readyToSubmit: true, entryCount: 0, entries: [], readiness: { readyToSubmit: true } });
  };

  try {
    const result = await validateSite({
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      sitemapExcluded: [{ type: "page", siteSlug: "gien", pageSlug: "nouvelle-page", reason: "page-not-published" }],
      agency: {
        agencyId: 1,
        siteSlug: "gien",
        pages: [{
          slug: "nouvelle-page",
          changed: true,
          expectedChanges: [{ blockId: 21, blockType: "hero", field: "title", next: "Projet de voyage à Gien" }],
        }],
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.pages[0].mode, "unpublished");
    assert.equal(result.pages[0].persistedProof.ok, true);
    assert.equal(result.pages[0].publicProof.present, false);
    assert.equal(result.pages[0].htmlProof.skipped, true);
  } finally {
    global.fetch = previousFetch;
  }
});
