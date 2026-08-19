"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const SitemapBuilder = require("./sitemap-builder");
const { isPublishedPage } = require("./sitemap-builder");

test("sitemap exposes only publicly published pages", () => {
  const builder = new SitemapBuilder();
  const site = { basePath: "/agence/gien" };
  const pages = [
    { path: "/agence/gien", pageType: "HOME", status: "published", published: true },
    { path: "/agence/gien/partenaires", pageType: "PARTNERS", status: "draft", published: false },
    { path: "/agence/gien/services", pageType: "SERVICES", status: "published", published: false },
  ];

  const xml = builder.build(site, pages, "https://agences.mondescale.com");
  assert.match(xml, /https:\/\/agences\.mondescale\.com\/agence\/gien<\/loc>/);
  assert.match(xml, /https:\/\/agences\.mondescale\.com\/agence\/gien\/services<\/loc>/);
  assert.doesNotMatch(xml, /\/agence\/gien\/partenaires<\/loc>/);
  assert.equal(isPublishedPage(pages[1]), false);
  assert.equal(isPublishedPage(pages[2]), true);
});

test("published partner page enters sitemap only after publication", () => {
  const builder = new SitemapBuilder();
  const site = { basePath: "/agence/gien" };
  const partnerPage = { path: "/agence/gien/partenaires", pageType: "PARTNERS", status: "published", published: true };
  const xml = builder.build(site, [partnerPage], "https://agences.mondescale.com");
  assert.match(xml, /\/agence\/gien\/partenaires<\/loc>/);
});
