"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  allowsIndexing,
  extractCanonical,
  extractFirstTagText,
  extractHeroText,
  validatePublicHtml,
} = require("../scripts/mse-25-30-public-html-check");

const HTML = `<!doctype html>
<html><head>
<link rel="canonical" href="https://agences.mondescale.com/agence/gien/circuits" />
<meta name="robots" content="index,follow" />
<meta name="googlebot" content="index,follow,max-image-preview:large" />
</head><body>
<section class="public-site-hero">
<h1>Circuits à Gien</h1>
<p class="public-site-hero-text">Une introduction locale &amp; utile à Gien.</p>
</section>
</body></html>`;

test("public HTML proof lit H1, Hero, canonical et indexabilité", () => {
  assert.equal(extractFirstTagText(HTML, "h1"), "Circuits à Gien");
  assert.equal(extractHeroText(HTML), "Une introduction locale & utile à Gien.");
  assert.equal(extractCanonical(HTML), "https://agences.mondescale.com/agence/gien/circuits");
  assert.equal(allowsIndexing(HTML), true);

  const result = validatePublicHtml({
    html: HTML,
    canonicalUrl: "https://agences.mondescale.com/agence/gien/circuits",
    expectedChanges: [
      { blockType: "hero", field: "title", next: "Circuits à Gien" },
      { blockType: "hero", field: "subtitle", next: "Une introduction locale & utile à Gien." },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(result.h1.ok, true);
  assert.equal(result.heroText.ok, true);
  assert.equal(result.canonical.ok, true);
  assert.equal(result.indexable, true);
});

test("public HTML proof échoue sur H1 différent, noindex ou mauvais canonical", () => {
  const html = HTML
    .replace("Circuits à Gien", "Circuits à Nevers")
    .replace("index,follow", "noindex,follow")
    .replace("/agence/gien/circuits", "/agence/gien/croisieres");

  const result = validatePublicHtml({
    html,
    canonicalUrl: "https://agences.mondescale.com/agence/gien/circuits",
    expectedChanges: [{ blockType: "hero", field: "title", next: "Circuits à Gien" }],
  });

  assert.equal(result.ok, false);
  assert.equal(result.h1.ok, false);
  assert.equal(result.canonical.ok, false);
  assert.equal(result.indexable, false);
});
