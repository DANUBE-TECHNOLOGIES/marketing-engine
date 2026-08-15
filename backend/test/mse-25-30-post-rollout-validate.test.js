"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canonicalPagePath,
  containsExpected,
  entryMatchesPath,
  readOnlyRequest,
  validateExpectedChange,
  validateSite,
} = require("../scripts/mse-25-30-post-rollout-validate");

test("post-rollout refuse toute méthode autre que GET", async () => {
  await assert.rejects(
    () => readOnlyRequest("http://example.invalid", { method: "POST" }),
    (error) => error?.code === "MSE_25_30_POST_ROLLOUT_WRITE_METHOD_REFUSED"
  );
});

test("post-rollout compare exactement H1, introduction et href publics", () => {
  const page = {
    blocks: [
      {
        id: 12,
        blockType: "hero",
        content: {
          title: "Agence de voyages à Gien",
          subtitle: "Votre introduction locale à Gien.",
        },
      },
      {
        id: 13,
        blockType: "cards",
        content: { items: [{ title: "Circuits", href: "circuits" }] },
      },
    ],
  };

  assert.equal(validateExpectedChange(page, {
    blockId: 12,
    blockType: "hero",
    field: "title",
    next: "Agence de voyages à Gien",
  }).ok, true);
  assert.equal(validateExpectedChange(page, {
    blockId: 12,
    blockType: "hero",
    field: "subtitle",
    next: "Votre introduction locale à Gien.",
  }).ok, true);
  assert.equal(validateExpectedChange(page, {
    blockId: 13,
    blockType: "cards",
    field: "items.0.href",
    next: "circuits",
  }).ok, true);
  assert.equal(validateExpectedChange(page, {
    blockId: 12,
    blockType: "hero",
    field: "title",
    next: "Agence de voyages à Nevers",
  }).ok, false);
});

test("post-rollout reconnait un bloc généré même si l'hydratation publique ajoute des champs", () => {
  const actual = {
    title: "Votre spécialiste des circuits à Gien",
    text: "Texte local",
    __mediaSource: "asset-engine",
  };
  assert.equal(containsExpected(actual, {
    title: "Votre spécialiste des circuits à Gien",
    text: "Texte local",
  }), true);

  const result = validateExpectedChange({
    blocks: [{ id: 99, blockType: "rich-text", content: actual }],
  }, {
    blockId: null,
    blockType: "rich-text",
    field: "block",
    next: { title: "Votre spécialiste des circuits à Gien", text: "Texte local" },
  });
  assert.equal(result.ok, true);
});

test("post-rollout vérifie les chemins canoniques dans les entrées sitemap", () => {
  assert.equal(canonicalPagePath("gien", ""), "/agence/gien");
  assert.equal(canonicalPagePath("gien", "circuits"), "/agence/gien/circuits");
  assert.equal(entryMatchesPath({ url: "https://agences.mondescale.com/agence/gien/circuits" }, "/agence/gien/circuits"), true);
  assert.equal(entryMatchesPath({ url: "https://agences.mondescale.com/agence/gien/croisieres" }, "/agence/gien/circuits"), false);
});

test("post-rollout utilise uniquement GET et valide backend, sitemap et HTML public", async () => {
  const previousFetch = global.fetch;
  const calls = [];
  const canonicalUrl = "https://agences.mondescale.com/agence/gien/circuits";
  global.fetch = async (url, options = {}) => {
    const requestUrl = String(url);
    calls.push({ url: requestUrl, method: options.method || "GET" });

    if (requestUrl === canonicalUrl) {
      const html = `<!doctype html><html><head><link rel="canonical" href="${canonicalUrl}" /><meta name="robots" content="index,follow" /></head><body><section class="public-site-hero"><h1>Circuits à Gien</h1></section></body></html>`;
      return {
        ok: true,
        status: 200,
        headers: { get: () => "text/html; charset=utf-8" },
        text: async () => html,
      };
    }

    const isPublicContract = requestUrl.includes("/api/public-site-read/");
    const body = isPublicContract
      ? {
          pages: [{
            slug: "circuits",
            published: true,
            contentSource: "website-designer-v2-blocks",
            blocks: [{
              id: 12,
              blockType: "hero",
              content: { title: "Circuits à Gien" },
            }],
          }],
        }
      : {
          readyToSubmit: true,
          entryCount: 1,
          entries: [{ siteSlug: "gien", url: canonicalUrl }],
          readiness: { readyToSubmit: true },
        };
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };

  try {
    const result = await validateSite({
      origin: "http://127.0.0.1:4000",
      tenant: "mondescale",
      agency: {
        agencyId: 1,
        siteSlug: "gien",
        pages: [{
          slug: "circuits",
          changed: true,
          expectedChanges: [{ blockId: 12, blockType: "hero", field: "title", next: "Circuits à Gien" }],
        }],
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.readyToSubmit, true);
    assert.equal(result.pages[0].sitemapPresent, true);
    assert.equal(result.pages[0].htmlProof.ok, true);
    assert.equal(result.pages[0].htmlProof.h1.actual, "Circuits à Gien");
    assert.equal(result.pages[0].matchedChangeCount, 1);
    assert.equal(calls.length, 3);
    assert.deepEqual(calls.map((call) => call.method), ["GET", "GET", "GET"]);
  } finally {
    global.fetch = previousFetch;
  }
});

test("post-rollout échoue si la page n'est plus prête à l'indexation", async () => {
  const previousFetch = global.fetch;
  global.fetch = async (url) => {
    const isPublic = String(url).includes("/api/public-site-read/");
    const body = isPublic
      ? { pages: [{ slug: "", published: true, contentSource: "website-designer-v2-blocks", blocks: [] }] }
      : { readyToSubmit: false, entryCount: 0, entries: [], readiness: { readyToSubmit: false } };
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
      agency: { agencyId: 1, siteSlug: "gien", pages: [{ slug: "", changed: true, expectedChanges: [] }] },
    });
    assert.equal(result.ok, false);
    assert.equal(result.readyToSubmit, false);
    assert.equal(result.pages[0].sitemapPresent, false);
    assert.equal(result.pages[0].htmlProof.skipped, true);
  } finally {
    global.fetch = previousFetch;
  }
});
