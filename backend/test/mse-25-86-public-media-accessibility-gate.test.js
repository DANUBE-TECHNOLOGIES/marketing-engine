"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const {
  attr,
  duplicateIds,
  hasAttr,
  hasReservedGeometry,
  hasViewportMeta,
  htmlLanguage,
  imageTags,
  inspectHtml,
  sitemapUrls,
  summarize,
} = require("../scripts/mse-25-86-public-media-accessibility-gate");

test("MSE-25.86 parses sitemap URLs and decodes XML entities", () => {
  assert.deepEqual(
    sitemapUrls("<urlset><url><loc>https://example.test/a?x=1&amp;y=2</loc></url></urlset>"),
    ["https://example.test/a?x=1&y=2"]
  );
});

test("MSE-25.86 attribute helpers support quoted and unquoted HTML attributes", () => {
  const tag = '<img src="/a.jpg" alt="Photo" width=800 height="600">';
  assert.equal(attr(tag, "src"), "/a.jpg");
  assert.equal(attr(tag, "width"), "800");
  assert.equal(hasAttr(tag, "alt"), true);
  assert.equal(hasAttr(tag, "loading"), false);
});

test("MSE-25.86 exact attribute parsing never mistakes data-* suffixes for real attributes", () => {
  const tag = '<article data-partner-id="fram" data-width="99" id="real-card"></article>';
  assert.equal(attr(tag, "id"), "real-card");
  assert.equal(attr(tag, "width"), null);
  assert.equal(hasAttr(tag, "id"), true);
  assert.equal(hasAttr('<article data-partner-id="fram"></article>', "id"), false);

  const html = [
    '<article data-partner-id="fram"></article>',
    '<article data-preferred-partner-id="fram"></article>',
    '<article id="actual"></article>',
    '<article id="actual"></article>',
  ].join("");
  assert.deepEqual(duplicateIds(html), ["actual"]);
});

test("MSE-25.86 accepts explicit geometry, fill images and aspect-ratio reservation", () => {
  assert.equal(hasReservedGeometry('<img width="160" height="64" alt="">'), true);
  assert.equal(hasReservedGeometry('<img data-nimg="fill" alt="">'), true);
  assert.equal(hasReservedGeometry('<img style="aspect-ratio:16/9" alt="">'), true);
  assert.equal(hasReservedGeometry('<img alt="" src="/x.jpg">'), false);
});

test("MSE-25.86 detects duplicate ids deterministically", () => {
  const html = '<main id="content"><div id="same"></div><section id="same"></section><p id="unique"></p></main>';
  assert.deepEqual(duplicateIds(html), ["same"]);
});

test("MSE-25.86 validates French language, viewport and healthy image hygiene", () => {
  const html = `<!doctype html>
  <html lang="fr-FR"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
  <body>
    <img src="https://cdn.test/hero.jpg" alt="" width="1920" height="1080" fetchpriority="high" loading="eager">
    <img src="https://cdn.test/logo.svg" alt="Logo" width="160" height="64" loading="lazy">
  </body></html>`;

  assert.equal(htmlLanguage(html), "fr-fr");
  assert.equal(hasViewportMeta(html), true);
  assert.equal(imageTags(html).length, 2);

  const result = inspectHtml({ url: "https://example.test/page", html, status: 200 });
  assert.equal(result.ok, true);
  assert.equal(result.missingAltCount, 0);
  assert.equal(result.missingGeometryCount, 0);
  assert.equal(result.highPriorityCount, 1);
  assert.equal(result.eagerCount, 1);
});

test("MSE-25.86 fails closed on accessibility, CLS and insecure-media regressions", () => {
  const html = `<!doctype html>
  <html><head></head><body>
    <div id="dup"></div><div id="dup"></div>
    <img src="http://cdn.test/no-alt.jpg">
    <img src="https://cdn.test/no-size.jpg" alt="Photo" loading="eager" fetchpriority="high">
    <img src="https://cdn.test/second.jpg" alt="Photo 2" width="100" height="100" loading="eager" fetchpriority="high">
  </body></html>`;

  const result = inspectHtml({ url: "https://example.test/page", html, status: 200 });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.startsWith("document-lang-")));
  assert.ok(result.issues.includes("missing-viewport"));
  assert.ok(result.issues.some((issue) => issue.startsWith("duplicate-ids:")));
  assert.ok(result.issues.includes("images-missing-alt:1"));
  assert.ok(result.issues.includes("images-missing-geometry:2"));
  assert.ok(result.issues.includes("insecure-image-src:1"));
  assert.ok(result.issues.includes("too-many-high-priority-images:2"));
  assert.ok(result.issues.includes("too-many-eager-images:2"));
});

test("MSE-25.86 summary aggregates deterministic page-level media signals", () => {
  const good = inspectHtml({
    url: "https://example.test/good",
    status: 200,
    html: '<html lang="fr"><head><meta name="viewport" content="width=device-width"></head><body><img alt="" width="1" height="1" src="https://cdn.test/a.png"></body></html>',
  });
  const bad = inspectHtml({
    url: "https://example.test/bad",
    status: 200,
    html: '<html lang="en"><head></head><body><img src="/b.png"></body></html>',
  });

  const summary = summarize([good, bad]);
  assert.equal(summary.urlCount, 2);
  assert.equal(summary.failureCount, 1);
  assert.equal(summary.imageCount, 2);
  assert.equal(summary.missingAltCount, 1);
  assert.equal(summary.missingGeometryCount, 1);
  assert.equal(summary.languageOkCount, 1);
  assert.equal(summary.viewportOkCount, 1);
});
