"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  collectHtmlHrefs,
  collectLinks,
  editorialLinkingIssues,
} = require("../src/modules/minisite-seo-enrichment/pre-rollout-quality");

test("collectHtmlHrefs extracts quoted and unquoted persisted anchors", () => {
  const html = [
    '<p><a href="/agence/gien/avis">Avis</a></p>',
    "<p><a class='cta' href='/agence/gien/contact?from=home'>Contact</a></p>",
    "<a href=/agence/gien/services>Services</a>",
  ].join("");

  assert.deepEqual(collectHtmlHrefs(html), [
    "/agence/gien/avis",
    "/agence/gien/contact?from=home",
    "/agence/gien/services",
  ]);
});

test("collectLinks discovers hrefs inside rich-text HTML as well as structured link fields", () => {
  const blocks = [{
    content: {
      html: '<p><a href="/agence/gien/avis">Avis</a></p>',
      links: [{ href: "/agence/gien/equipe" }],
    },
  }];

  assert.deepEqual(collectLinks(blocks), [
    "/agence/gien/avis",
    "/agence/gien/equipe",
  ]);
});

test("persisted HTML anchors satisfy editorial incoming-link measurement", () => {
  const homeLinks = collectLinks([{ content: { html: '<a href="/agence/gien/contact">Contact</a>' } }]);
  const issues = editorialLinkingIssues([
    {
      published: true,
      pageKind: "home",
      siteSlug: "gien",
      slug: "home",
      expectedCanonicalPath: "/agence/gien",
      internalLinks: homeLinks,
    },
    {
      published: true,
      pageKind: "agency",
      siteSlug: "gien",
      slug: "contact",
      expectedCanonicalPath: "/agence/gien/contact",
      internalLinks: [],
    },
  ]);

  assert.deepEqual(issues, []);
});
