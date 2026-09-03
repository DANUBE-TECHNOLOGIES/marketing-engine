"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  localDifferentiationCheck,
  publishedPageText,
  score,
} = require("./prepublication-readiness");

function page(slug, content, options = {}) {
  return {
    id: slug || "home",
    slug,
    title: options.title || slug || "Accueil",
    h1: options.h1 || "",
    seoTitle: options.seoTitle || "",
    metaDescription: options.metaDescription || "",
    blocks: [
      {
        status: "published",
        content,
      },
    ],
    sections: [],
  };
}

test("publishedPageText ignores hidden or draft-only copy", () => {
  const value = publishedPageText({
    title: "Services",
    blocks: [
      { status: "published", content: { text: "Conseil croisière à Gien" } },
      { status: "draft", content: { text: "Texte brouillon confidentiel" } },
      { status: "hidden", content: { text: "Texte masqué" } },
    ],
    sections: [],
  });

  assert.match(value, /Conseil croisière à Gien/);
  assert.doesNotMatch(value, /brouillon/);
  assert.doesNotMatch(value, /masqué/);
});

test("local differentiation rewards substantive agency-specific copy without blocking launch", () => {
  const site = {
    pages: [
      page("", {
        title: "Agence Mondescale Gien",
        text: "Notre équipe de Gien vous accueille en agence pour construire votre voyage selon vos envies, votre budget et vos dates. Nous prenons le temps de comparer les solutions et de vous accompagner avant, pendant et après votre départ avec un interlocuteur de proximité.",
      }),
      page("agence", {
        title: "Une équipe de proximité à Gien",
        text: "Mondescale Gien accompagne les voyageurs de Gien et des environs avec une connaissance concrète des projets de vacances, des départs régionaux et des attentes de ses clients. Notre équipe privilégie le conseil humain et le suivi personnalisé pour chaque dossier de voyage.",
      }),
      page("services", { title: "Services à Gien" }),
      page("contact", { title: "Contacter Mondescale Gien" }),
    ],
  };

  const check = localDifferentiationCheck(site, {
    name: "Mondescale Gien",
    city: "Gien",
  });

  assert.equal(check.required, false);
  assert.equal(check.passed, true);
  assert.ok(check.substantivePages >= 2);
  assert.ok(check.locallyAnchoredPages >= 3);
});

test("generic thin content remains a recommendation, not a publication blocker", () => {
  const check = localDifferentiationCheck(
    {
      pages: [
        page("", { text: "Préparez votre prochain voyage." }),
        page("agence", { text: "Découvrez notre agence." }),
        page("services", { text: "Découvrez nos services." }),
        page("contact", { text: "Contactez-nous." }),
      ],
    },
    { name: "Mondescale Nevers", city: "Nevers" }
  );

  assert.equal(check.required, false);
  assert.equal(check.passed, false);
  assert.ok(check.recommendation);
});

test("readiness weights still total 100 points", () => {
  const codes = [
    "SITE",
    "IDENTITY",
    "GENERAL_CONTENT",
    "LEGAL",
    "SEO",
    "LOCAL_SEO",
    "LOCAL_CONTENT",
  ];
  assert.equal(
    score(codes.map((code) => ({ code, passed: true }))),
    100
  );
});
