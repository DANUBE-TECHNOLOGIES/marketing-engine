"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  countTag,
  extractMetaDescription,
  extractTitle,
  hasReassuranceBand,
  inspectHtml,
  parseJsonLd,
  percentile,
  sitemapUrls,
  summarize,
} = require("../scripts/mse-25-84-public-surface-quality-gate");

const URL = "https://agences.mondescale.com/agence/site-a/services";

function validHtml(overrides = {}) {
  const canonical = overrides.canonical || URL;
  const robots = overrides.robots || "index,follow";
  const h1 = overrides.h1 === undefined ? "<h1>Agence de voyages</h1>" : overrides.h1;
  const title = overrides.title === undefined ? "<title>Agence de voyages</title>" : overrides.title;
  const description = overrides.description === undefined
    ? '<meta name="description" content="Conseils et voyages sur mesure">'
    : overrides.description;
  const jsonLd = overrides.jsonLd === undefined
    ? '<script type="application/ld+json">{"@context":"https://schema.org","@type":"TravelAgency"}</script>'
    : overrides.jsonLd;
  const reassurance = overrides.reassurance === undefined
    ? '<section class="public-reassurance"><p>Garanties</p></section>'
    : overrides.reassurance;

  return `<!doctype html><html><head>${title}${description}<link rel="canonical" href="${canonical}"><meta name="robots" content="${robots}">${jsonLd}</head><body>${h1}${reassurance}</body></html>`;
}

test("MSE-25.84 parses canonical sitemap URLs without inventing entries", () => {
  const xml = `<?xml version="1.0"?><urlset>
    <url><loc>https://agences.mondescale.com/agence/site-a</loc></url>
    <url><loc>https://agences.mondescale.com/agence/site-a/destination/sicile?x=1&amp;y=2</loc></url>
  </urlset>`;
  assert.deepEqual(sitemapUrls(xml), [
    "https://agences.mondescale.com/agence/site-a",
    "https://agences.mondescale.com/agence/site-a/destination/sicile?x=1&y=2",
  ]);
});

test("MSE-25.84 accepts a healthy indexable public page", () => {
  const result = inspectHtml({ url: URL, html: validHtml(), status: 200, finalUrl: URL });
  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.h1Count, 1);
  assert.equal(result.indexable, true);
  assert.equal(result.jsonLdCount, 1);
  assert.equal(result.reassurance, true);
});

test("MSE-25.84 fails closed on canonical, indexation and H1 regressions", () => {
  const result = inspectHtml({
    url: URL,
    html: validHtml({
      canonical: "https://agences.mondescale.com/agence/site-a/contact",
      robots: "noindex,follow",
      h1: "<h1>A</h1><h1>B</h1>",
    }),
    status: 200,
    finalUrl: URL,
  });
  assert.equal(result.ok, false);
  assert.equal(result.issues.includes("canonical-mismatch"), true);
  assert.equal(result.issues.includes("noindex"), true);
  assert.equal(result.issues.includes("h1-count-2"), true);
});

test("MSE-25.84 requires metadata, parseable JSON-LD and reassurance on sitemap pages", () => {
  const result = inspectHtml({
    url: URL,
    html: validHtml({
      title: "",
      description: "",
      jsonLd: '<script type="application/ld+json">{"broken":</script>',
      reassurance: "",
    }),
    status: 200,
    finalUrl: URL,
  });
  assert.equal(result.ok, false);
  assert.equal(result.issues.includes("missing-title"), true);
  assert.equal(result.issues.includes("missing-meta-description"), true);
  assert.equal(result.issues.includes("invalid-jsonld"), true);
  assert.equal(result.issues.includes("missing-reassurance-band"), true);
});

test("MSE-25.84 detects unexpected redirects even when the final document is otherwise valid", () => {
  const result = inspectHtml({
    url: URL,
    html: validHtml(),
    status: 200,
    redirected: true,
    finalUrl: `${URL}/`,
  });
  assert.equal(result.ok, false);
  assert.equal(result.issues.includes("unexpected-redirect"), true);
});

test("MSE-25.84 helpers keep public quality reporting deterministic", () => {
  const html = validHtml();
  assert.equal(countTag(html, "h1"), 1);
  assert.equal(extractTitle(html), "Agence de voyages");
  assert.equal(extractMetaDescription(html), "Conseils et voyages sur mesure");
  assert.equal(hasReassuranceBand(html), true);
  assert.deepEqual(parseJsonLd(html).errors, []);
  assert.equal(percentile([100, 200, 300, 400], 0.95), 400);

  const summary = summarize([
    { ok: true, durationMs: 100 },
    { ok: false, durationMs: 200, url: URL, issues: ["noindex"] },
  ]);
  assert.equal(summary.urlCount, 2);
  assert.equal(summary.okCount, 1);
  assert.equal(summary.failureCount, 1);
  assert.equal(summary.failures[0].url, URL);
});
