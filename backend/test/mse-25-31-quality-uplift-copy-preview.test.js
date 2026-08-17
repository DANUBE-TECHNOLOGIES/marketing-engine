"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildBodyCopyPreview,
  pageProfile,
  selectParagraphs,
} = require("../src/modules/minisite-seo-enrichment/quality-uplift-copy-preview");

test("pageProfile recognizes thin editorial page families deterministically", () => {
  assert.equal(pageProfile({ slug: "equipe", title: "Notre équipe" }), "team");
  assert.equal(pageProfile({ slug: "partenaires", title: "Nos partenaires" }), "partners");
  assert.equal(pageProfile({ slug: "avis", title: "Avis clients" }), "reviews");
});

test("body preview uses only supplied agency/page context and does not invent local facts", () => {
  const preview = buildBodyCopyPreview({
    agency: { name: "Mondescale Gien", city: "Gien" },
    page: { slug: "avis", title: "Avis clients" },
    action: {
      recommendedFields: ["body"],
      thinContent: { missingWords: 60 },
    },
  });

  assert.equal(preview.generatedBy, "mse-25.31");
  assert.equal(preview.factualPolicy, "agency-and-page-context-only");
  assert.equal(preview.sourceFacts.agencyName, "Mondescale Gien");
  assert.equal(preview.sourceFacts.city, "Gien");
  assert.equal(preview.sourceFacts.pageSlug, "avis");
  assert.equal(preview.paragraphCount, 2);
  assert.match(preview.html, /Gien/);
  assert.doesNotMatch(preview.html, /Montargis|Orléans|Briare|Loiret/i);
});

test("body preview is absent when body uplift was not recommended", () => {
  const preview = buildBodyCopyPreview({
    agency: { name: "Mondescale", city: "Gien" },
    page: { slug: "services", title: "Services" },
    action: { recommendedFields: ["internal-link"] },
  });

  assert.equal(preview, null);
});

test("selectParagraphs scales conservatively with missing depth", () => {
  const paragraphs = ["un", "deux", "trois"];
  assert.deepEqual(selectParagraphs(paragraphs, 20), ["un"]);
  assert.deepEqual(selectParagraphs(paragraphs, 60), ["un", "deux"]);
  assert.deepEqual(selectParagraphs(paragraphs, 100), ["un", "deux", "trois"]);
});
