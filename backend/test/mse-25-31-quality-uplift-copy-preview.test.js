"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildBodyCopyPreview, pageProfile, selectParagraphs } = require("../src/modules/minisite-seo-enrichment/quality-uplift-copy-preview");

test("pageProfile recognizes thin editorial page families deterministically", () => {
  assert.equal(pageProfile({ slug: "equipe", title: "Notre équipe" }), "team");
  assert.equal(pageProfile({ slug: "partenaires", title: "Nos partenaires" }), "partners");
  assert.equal(pageProfile({ slug: "avis", title: "Avis clients" }), "reviews");
});

test("body preview uses only supplied agency/page context and does not invent local facts", () => {
  const preview = buildBodyCopyPreview({ agency: { id: 4, name: "Mondescale Gien", city: "Gien" }, page: { slug: "avis", title: "Avis clients" }, action: { recommendedFields: ["body"], thinContent: { missingWords: 60 } } });
  assert.equal(preview.generatedBy, "mse-25.31");
  assert.equal(preview.factualPolicy, "agency-and-page-context-only");
  assert.equal(preview.sourceFacts.agencyName, "Mondescale Gien");
  assert.equal(preview.sourceFacts.city, "Gien");
  assert.equal(preview.sourceFacts.pageSlug, "avis");
  assert.equal(preview.paragraphCount, 2);
  assert.match(preview.html, /Gien/);
  assert.doesNotMatch(preview.html, /Montargis|Orléans|Briare|Loiret/i);
  assert.doesNotMatch(preview.title, /Mondescale Gien à Gien/i);
});

test("body preview is deterministic for the same agency and page", () => {
  const input = { agency: { id: 4, name: "Mondescale Gien", city: "Gien" }, page: { slug: "equipe", title: "Notre équipe" }, action: { recommendedFields: ["body"], thinContent: { missingWords: 60 } } };
  assert.deepEqual(buildBodyCopyPreview(input), buildBodyCopyPreview(input));
});

test("body preview varies across agencies without inventing neighboring locations", () => {
  const action = { recommendedFields: ["body"], thinContent: { missingWords: 60 } };
  const gien = buildBodyCopyPreview({ agency: { id: 4, name: "Mondescale Gien", city: "Gien" }, page: { slug: "partenaires", title: "Nos partenaires" }, action });
  const nevers = buildBodyCopyPreview({ agency: { id: 2, name: "Mondescale Nevers", city: "Nevers" }, page: { slug: "partenaires", title: "Nos partenaires" }, action });
  assert.notEqual(gien.html, nevers.html);
  assert.match(gien.html, /Gien/);
  assert.match(nevers.html, /Nevers/);
  assert.doesNotMatch(gien.html, /Nevers/i);
  assert.doesNotMatch(nevers.html, /Gien/i);
});

test("review copy avoids broken apposition agreement and duplicate city wording", () => {
  const action = { recommendedFields: ["body"], thinContent: { missingWords: 60 } };
  for (const agency of [
    { id: 1, name: "Mondescale Maurepas", city: "Maurepas" },
    { id: 7, name: "Mondescale Lamorlaye", city: "Lamorlaye" },
    { id: 5, name: "Mondescale Ozoir la Ferrière", city: "Ozoir la Ferrière" },
  ]) {
    const preview = buildBodyCopyPreview({ agency, page: { slug: "avis", title: "Avis clients" }, action });
    assert.doesNotMatch(preview.html, /votre agence de voyages à [^<]+ permettent/i);
    assert.doesNotMatch(preview.html, /Mondescale ([^,<]+), votre agence de voyages à \1/i);
  }
});

test("team and partner copy avoids mechanical agency-city repetition", () => {
  const action = { recommendedFields: ["body"], thinContent: { missingWords: 60 } };
  const agency = { id: 5, name: "Mondescale Ozoir la Ferrière", city: "Ozoir la Ferrière" };
  const team = buildBodyCopyPreview({ agency, page: { slug: "equipe", title: "Notre équipe" }, action });
  const partners = buildBodyCopyPreview({ agency, page: { slug: "partenaires", title: "Nos partenaires" }, action });
  assert.doesNotMatch(team.html, /Mondescale Ozoir la Ferrière[^<]{0,100}à Ozoir la Ferrière[^<]{0,100}Ozoir la Ferrière/i);
  assert.doesNotMatch(partners.html, /agence de Ozoir la Ferrière[^<]{0,80}Ozoir la Ferrière/i);
});

test("body preview is absent when body uplift was not recommended", () => {
  const preview = buildBodyCopyPreview({ agency: { name: "Mondescale", city: "Gien" }, page: { slug: "services", title: "Services" }, action: { recommendedFields: ["internal-link"] } });
  assert.equal(preview, null);
});

test("selectParagraphs scales conservatively with missing depth", () => {
  const paragraphs = ["un", "deux", "trois"];
  assert.deepEqual(selectParagraphs(paragraphs, 20), ["un"]);
  assert.deepEqual(selectParagraphs(paragraphs, 60), ["un", "deux"]);
  assert.deepEqual(selectParagraphs(paragraphs, 100), ["un", "deux", "trois"]);
});
