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

test("PARTENAIRES est accepté comme alias de type de page", () => {
  const sections = builder.buildSections(
    { pageType: "PARTENAIRES" },
    agency,
    site
  );

  assert.equal(
    sections.some((section) => section.sectionType === "partner-directory"),
    true
  );
});
