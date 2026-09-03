"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSeoPlan,
  descriptionForPage,
  generateSeoMetadata,
  titleForPage,
} = require("../src/modules/minisite-seo-enrichment");

const agency = {
  id: 6,
  name: "Ambassade FRAM - Mondescale Bois-Colombes",
  city: "Bois-Colombes",
};

const site = {
  id: "site-1",
  slug: "ambassade-fram-mondescale-bois-colombes",
};

test("génère un titre local pour l’accueil", () => {
  const title = titleForPage({ agency, page: { slug: "", title: "Accueil" } });
  assert.ok(title.includes("Bois-Colombes"));
  assert.ok(title.length <= 65);
});

test("traite accueil et home comme la vraie home SEO", () => {
  for (const slug of ["accueil", "home"]) {
    const title = titleForPage({ agency, page: { slug, title: "Accueil" } });
    const description = descriptionForPage({ agency, page: { slug, title: "Accueil" } });
    assert.match(title, /^Agence de voyages à Bois-Colombes/i);
    assert.match(description, /Bois-Colombes/);
    assert.match(description, /séjours|circuits|croisières/i);
  }
});

test("génère une description bornée", () => {
  const description = descriptionForPage({ agency, page: { slug: "services", title: "Nos services" } });
  assert.ok(description.length <= 160);
  assert.ok(description.includes("Bois-Colombes"));
});

test("préserve les métadonnées existantes dans le mode enrichissement historique", () => {
  const result = generateSeoMetadata({
    agency,
    site,
    publicOrigin: "https://agences.mondescale.com",
    page: {
      id: "page-1",
      slug: "services",
      title: "Nos services",
      seoTitle: "Titre existant",
      metaDescription: "Description existante",
    },
  });
  assert.equal(result.generated.seoTitle, "Titre existant");
  assert.equal(result.generated.metaDescription, "Description existante");
  assert.equal(result.actions.setSeoTitle, false);
  assert.equal(result.actions.setMetaDescription, false);
});

test("MSE-25.30 remplace volontairement des métadonnées existantes en mode optimisation", () => {
  const result = generateSeoMetadata({
    agency,
    site,
    publicOrigin: "https://agences.mondescale.com",
    optimizeExisting: true,
    page: {
      id: "page-1",
      slug: "services",
      title: "Nos services",
      seoTitle: "Bienvenue chez nous",
      metaDescription: "Découvrez notre univers.",
    },
  });
  assert.notEqual(result.generated.seoTitle, "Bienvenue chez nous");
  assert.match(result.generated.seoTitle, /Services de voyage à Bois-Colombes/i);
  assert.match(result.generated.metaDescription, /Bois-Colombes/);
  assert.equal(result.actions.setSeoTitle, true);
  assert.equal(result.actions.replaceSeoTitle, true);
  assert.equal(result.actions.setMetaDescription, true);
  assert.equal(result.actions.replaceMetaDescription, true);
});

test("les pages légales passent en noindex", () => {
  const result = generateSeoMetadata({
    agency,
    site,
    publicOrigin: "https://agences.mondescale.com",
    page: { id: "page-1", slug: "mentions-legales", title: "Mentions légales" },
  });
  assert.equal(result.generated.robots.index, false);
});

test("le plan compte les métadonnées manquantes", () => {
  const result = buildSeoPlan({
    publicOrigin: "https://agences.mondescale.com",
    sites: [{
      ...site,
      agency,
      pages: [
        { id: "page-1", slug: "", title: "Accueil", seoTitle: "", metaDescription: "" },
        { id: "page-2", slug: "contact", title: "Contact", seoTitle: "Contact agence", metaDescription: "" },
      ],
    }],
  });
  assert.equal(result.summary.pageCount, 2);
  assert.equal(result.summary.missingSeoTitles, 1);
  assert.equal(result.summary.missingMetaDescriptions, 2);
});

test("MSE-25.30 planifie les remplacements SEO existants d’une agence réelle", () => {
  const result = buildSeoPlan({
    publicOrigin: "https://agences.mondescale.com",
    optimizeExisting: true,
    sites: [{
      ...site,
      agency,
      pages: [
        { id: "page-1", slug: "", title: "Accueil", seoTitle: "Accueil", metaDescription: "Bienvenue." },
        { id: "page-2", slug: "contact", title: "Contact", seoTitle: "Contact", metaDescription: "Nous contacter." },
      ],
    }],
  });
  assert.equal(result.optimizeExisting, true);
  assert.equal(result.summary.seoTitlesToOptimize, 2);
  assert.equal(result.summary.metaDescriptionsToOptimize, 2);
  assert.equal(result.summary.writeActions, 4);
});
