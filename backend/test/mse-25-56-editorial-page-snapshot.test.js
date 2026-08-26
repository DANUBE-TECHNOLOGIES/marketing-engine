"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWebsiteDesignerEditorialSnapshot } = require("../src/modules/minisite-semantic-engine/editorial-page-snapshot");

function page(overrides = {}) {
  return {
    id: "page-123", slug: "services", path: "/services", title: "Services", h1: "Nos services", status: "published", published: true,
    site: { slug: "gien" },
    sections: [{ sectionType: "hero", jsonContent: { __builderType: "hero", title: "Billetterie et vols à Gien", introduction: "Votre agence vous accompagne pour vos billets." } }],
    blocks: [], ...overrides,
  };
}

test("snapshot reads title and introduction from Website Designer V2 without mutation", () => {
  const snapshot = buildWebsiteDesignerEditorialSnapshot({ page: page(), expectedSiteSlug: "gien", expectedPath: "/services" });
  assert.equal(snapshot.source, "WEBSITE_DESIGNER_V2");
  assert.equal(snapshot.readOnly, true);
  assert.equal(snapshot.writes, false);
  assert.equal(snapshot.pageIdentity, "page-123");
  assert.equal(snapshot.title, "Billetterie et vols à Gien");
  assert.equal(snapshot.introduction, "Votre agence vous accompagne pour vos billets.");
  assert.equal(snapshot.published, true);
});

test("snapshot detects explicit manual editorial marker", () => {
  const snapshot = buildWebsiteDesignerEditorialSnapshot({ page: page({ sections: [{ sectionType: "hero", jsonContent: { title: "Titre", introduction: "Texte manuel", editorialSource: "manual" } }] }) });
  assert.equal(snapshot.manualEditorialContent, true);
});

test("snapshot accepts duplicated builder section suffix", () => {
  const snapshot = buildWebsiteDesignerEditorialSnapshot({ page: page({ sections: [{ sectionType: "hero--2", jsonContent: { __builderType: "hero", title: "Titre hero", subtitle: "Introduction hero" } }] }) });
  assert.equal(snapshot.title, "Titre hero");
  assert.equal(snapshot.introduction, "Introduction hero");
});

test("site or path mismatch fails closed", () => {
  assert.throws(() => buildWebsiteDesignerEditorialSnapshot({ page: page(), expectedSiteSlug: "dax" }), /SITE_MISMATCH/);
  assert.throws(() => buildWebsiteDesignerEditorialSnapshot({ page: page(), expectedPath: "/agence" }), /PATH_MISMATCH/);
});
