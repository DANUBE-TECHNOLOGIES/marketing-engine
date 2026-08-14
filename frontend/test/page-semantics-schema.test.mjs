import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPageSemanticsSchema,
  isoDate,
  pageSemanticType,
} from "../lib/seo/page-semantics-schema.js";

test("contact est exposé comme ContactPage", () => {
  assert.equal(pageSemanticType({ slug: "contact" }), "ContactPage");
});

test("agence et équipe sont exposées comme AboutPage", () => {
  assert.equal(pageSemanticType({ slug: "agence" }), "AboutPage");
  assert.equal(pageSemanticType({ slug: "equipe" }), "AboutPage");
});

test("destinations et inspirations sont exposées comme CollectionPage", () => {
  assert.equal(pageSemanticType({ slug: "destinations" }), "CollectionPage");
  assert.equal(pageSemanticType({ slug: "inspiration" }), "CollectionPage");
});

test("le schéma conserve les dates éditoriales vérifiables", () => {
  const schema = buildPageSemanticsSchema({
    page: {
      slug: "contact",
      createdAt: "2026-08-01T08:00:00.000Z",
      updatedAt: "2026-08-14T08:00:00.000Z",
    },
    url: "/agence/test/contact",
  });

  assert.deepEqual(schema["@type"], ["WebPage", "ContactPage"]);
  assert.equal(schema.datePublished, "2026-08-01T08:00:00.000Z");
  assert.equal(schema.dateModified, "2026-08-14T08:00:00.000Z");
});

test("une date invalide n'est pas publiée", () => {
  assert.equal(isoDate("n'importe quoi"), undefined);
});
