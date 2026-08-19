"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const SiteBuilder = require("../src/modules/agency-site/builders/site-builder");
const ContentBuilder = require("../src/modules/agency-site/builders/content-builder");

function fixture() {
  const agency = {
    id: 1,
    name: "Ambassade FRAM - Mondescale Gien",
    city: "Gien",
    phone: "02 38 00 00 00",
  };
  const siteBuilder = new SiteBuilder();
  const contentBuilder = new ContentBuilder();
  const definition = siteBuilder.build(agency, "gien");
  const page = definition.pages.find((candidate) => candidate.pageType === "PARTNERS");
  const site = { ...definition.site, id: "site-gien" };
  const sections = contentBuilder.build(page, agency, site);
  return { agency, page, sections };
}

test("generated partner page keeps the final local SEO and editorial contract", () => {
  const { page, sections } = fixture();

  assert.equal(page.slug, "partenaires");
  assert.equal(page.path, "/agence/gien/partenaires");
  assert.equal(page.h1, "Nos partenaires de voyage à Gien");
  assert.equal(page.seoTitle, "Partenaires voyage à Gien | Ambassade FRAM - Mondescale Gien");
  assert.match(page.metaDescription, /tour-opérateurs, croisiéristes et spécialistes/);
  assert.match(page.metaDescription, /Gien/);

  assert.deepEqual(
    sections.map((section) => section.sectionType),
    ["page-header", "partners-introduction", "partner-directory", "contact-cta"]
  );

  const header = sections.find((section) => section.sectionType === "page-header");
  assert.equal(header.content.title, "Nos partenaires de voyage à Gien");
  assert.match(header.content.introduction, /tour-opérateurs, croisiéristes et spécialistes/);
  assert.match(header.content.introduction, /agence de voyages à Gien/);

  const introduction = sections.find((section) => section.sectionType === "partners-introduction");
  assert.equal(introduction.content.title, "Des partenaires sélectionnés par votre agence à Gien");
  assert.match(introduction.content.text, /vérifier les disponibilités, les conditions/);
  assert.match(introduction.content.text, /La présence d’une marque dans cet annuaire/);
});
