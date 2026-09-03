"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  entriesForSite,
  escapeXml,
  renderSitemapXml,
} = require("../src/modules/minisite-structured-data/sitemap-xml");

test("escapes XML-sensitive characters", () => {
  assert.equal(
    escapeXml('https://example.test/a?x=1&y="2"'),
    "https://example.test/a?x=1&amp;y=&quot;2&quot;"
  );
});

test("renders a valid sitemap urlset", () => {
  const xml = renderSitemapXml([
    {
      url: "https://example.test/agence/gien",
      lastModified: "2026-08-14T10:00:00.000Z",
      changeFrequency: "weekly",
      priority: 1,
    },
  ]);

  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.match(xml, /<loc>https:\/\/example\.test\/agence\/gien<\/loc>/);
  assert.match(xml, /<lastmod>2026-08-14T10:00:00\.000Z<\/lastmod>/);
  assert.match(xml, /<changefreq>weekly<\/changefreq>/);
  assert.match(xml, /<priority>1<\/priority>/);
});

test("filters entries to one minisite before candidate rendering", () => {
  const sitemap = {
    entries: [
      { siteSlug: "gien", url: "https://example.test/agence/gien" },
      { siteSlug: "gien", url: "https://example.test/agence/gien/contact" },
      { siteSlug: "nevers", url: "https://example.test/agence/nevers" },
    ],
  };

  assert.deepEqual(
    entriesForSite(sitemap, "gien").map((entry) => entry.url),
    [
      "https://example.test/agence/gien",
      "https://example.test/agence/gien/contact",
    ]
  );
});
