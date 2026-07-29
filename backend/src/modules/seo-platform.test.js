"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const sdk = require("../sdk");
const MultiPage = require("./seo-platform/multi-page-generator");
const Linking = require("./seo-platform/internal-linking");
const Schema = require("./seo-platform/schema-engine");
const Score = require("./seo-platform/seo-score");
const Factory = require("./seo-platform/service");

test("slugify destination", () => {
  assert.equal(MultiPage.slugify("Île de Ré"), "ile-de-re");
});

test("multi page plan", () => {
  const plan = MultiPage.create({ sdk }).plan({ destination: "Budapest" });
  assert.equal(plan.pageCount, 8);
  assert.equal(plan.pages[0].path, "/budapest");
});

test("internal linking", () => {
  const plan = MultiPage.create({ sdk }).plan({ destination: "Budapest" });
  const links = Linking.create({ sdk }).build(plan);
  assert.equal(links.pageCount, 8);
  assert.ok(links.links[1].links.length >= 1);
});

test("schema faq", () => {
  const schema = Schema.create({ sdk }).generate({
    page: { path: "/budapest", title: "Budapest" },
    content: { faq: [{ question: "Quand ?", answer: "Au printemps." }] }
  });
  assert.ok(schema["@graph"].some(item => item["@type"] === "FAQPage"));
});

test("seo score", () => {
  const result = Score.create({ sdk }).score({
    page: { title: "Budapest", keyword: "voyage Budapest" },
    content: {
      introduction: "Une introduction suffisamment longue pour présenter correctement la destination et préparer le lecteur à organiser son voyage.",
      sections: [
        { heading: "Voir", body: "Contenu ".repeat(70) },
        { heading: "Faire", body: "Contenu ".repeat(70) }
      ],
      faq: [{ question: "Quand partir ?", answer: "Au printemps." }],
      callToAction: "Contactez-nous."
    },
    links: [{ target: "/x" }, { target: "/y" }],
    schema: { "@graph": [] }
  });
  assert.ok(result.score >= 90);
});

test("complete factory", () => {
  const factory = Factory.create({ sdk });
  const result = factory.buildFactory({
    destination: "Budapest",
    content: {
      title: "Budapest",
      introduction: "Découvrez Budapest et préparez votre séjour avec nos conseils pratiques et notre expertise locale.",
      sections: [
        { heading: "Découvrir", body: "Contenu ".repeat(70) },
        { heading: "Organiser", body: "Contenu ".repeat(70) }
      ],
      faq: [{ question: "Quand partir ?", answer: "Au printemps." }],
      callToAction: "Contactez Mondescale Voyages."
    }
  });
  assert.equal(result.summary.pageCount, 8);
});
