"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const DefaultContentBuilder = require("../src/modules/content-engine/default-content/default-content-builder");

const builder = new DefaultContentBuilder();
const agency = {
  id: 42,
  name: "Mondescale Test",
  city: "Testville",
  phone: "01 02 03 04 05",
  email: "test@example.test",
};
const site = {
  id: "site-42",
  slug: "mondescale-test",
};

test("PARTNERS reçoit un annuaire complet et un CTA sans dupliquer le bloc Home", () => {
  const sections = builder.buildSections(
    { pageType: "PARTNERS" },
    agency,
    site
  );

  assert.deepEqual(
    sections.map((section) => section.sectionType),
    ["page-header", "partner-directory", "contact-cta"]
  );

  const directory = sections.find((section) => section.sectionType === "partner-directory");
  assert.ok(directory);
  assert.equal(directory.content.content.title, "Tous nos partenaires voyage");
  assert.match(directory.content.content.text, /Parcourez nos partenaires par univers de voyage/);

  assert.equal(
    sections.some((section) => section.sectionType === "partner-logos" || section.sectionType === "logos"),
    false
  );
});

test("PARTNERS reçoit un SEO éditorial dédié", () => {
  const page = builder.buildPage(
    { pageType: "PARTNERS" },
    agency,
    site
  );

  assert.match(page.seo.title, /Tour-opérateurs et partenaires/);
  assert.match(page.seo.description, /croisiéristes/);
  assert.equal(page.seo.h1, "Nos partenaires voyage à Testville");
  assert.equal(page.seo.schemaType, "CollectionPage");
});

test("PARTENAIRES est accepté comme alias de type de page", () => {
  const page = builder.buildPage(
    { pageType: "PARTENAIRES" },
    agency,
    site
  );

  assert.equal(
    page.sections.some((section) => section.sectionType === "partner-directory"),
    true
  );
  assert.equal(page.seo.schemaType, "CollectionPage");
});
