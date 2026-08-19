const test = require("node:test");
const assert = require("node:assert/strict");

const SiteBuilder = require("../src/modules/agency-site/builders/site-builder");
const ContentBuilder = require("../src/modules/agency-site/builders/content-builder");

const agency = {
  id: 42,
  name: "Mondescale Gien",
  city: "Gien",
  address: "1 rue du Voyage",
  postalCode: "45500",
  phone: "02 38 00 00 00",
  email: "gien@example.test",
};

test("generated minisite exposes a localized partner page", () => {
  const built = new SiteBuilder().build(agency);
  const page = built.pages.find((item) => item.pageType === "PARTNERS");

  assert.ok(page);
  assert.equal(page.slug, "partenaires");
  assert.match(page.path, /\/partenaires$/);
  assert.equal(page.h1, "Nos partenaires voyage à Gien");
  assert.match(page.seoTitle, /Partenaires voyage à Gien/);
  assert.match(page.metaDescription, /tour-opérateurs, croisiéristes et spécialistes/);
});

test("generated partner page renders header, introduction, directory and contact CTA in order", () => {
  const built = new SiteBuilder().build(agency);
  const page = built.pages.find((item) => item.pageType === "PARTNERS");
  const sections = new ContentBuilder().build(page, agency, built.site);

  assert.deepEqual(
    sections.map((section) => section.sectionType),
    ["page-header", "partners-introduction", "partner-directory", "contact-cta"]
  );
  assert.equal(sections[0].content.title, "Nos partenaires voyage à Gien");
  assert.match(sections[0].content.introduction, /Mondescale Gien/);
  assert.match(sections[1].content.text, /tour-opérateurs|partenaires/i);
  assert.equal(sections[2].content.city, "Gien");
});
