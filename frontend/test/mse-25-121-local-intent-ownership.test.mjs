import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { buildLocalPageSeo } from "../lib/seo/local-page-seo.js";

function site(city) {
  return {
    name: `Mondescale ${city}`,
    city,
    agency: { city },
  };
}

function page(slug, title, extra = {}) {
  return { slug, title, ...extra };
}

function assertGenericIntentOwnedByHome(city) {
  const currentSite = site(city);
  const home = buildLocalPageSeo({
    site: currentSite,
    page: page("home", "Accueil"),
    pageSlug: "",
  });

  assert.equal(home.kind, "home");
  assert.equal(home.title, `Agence de voyages à ${city} | Mondescale`);
  assert.equal(home.heading, `Agence de voyages à ${city}`);

  const secondaryPages = [
    ["agence", "Notre agence"],
    ["equipe", "Équipe"],
    ["services", "Services"],
    ["avis", "Avis clients"],
    ["engagements", "Engagements"],
    ["contact", "Contact"],
  ];

  for (const [slug, title] of secondaryPages) {
    const seo = buildLocalPageSeo({
      site: currentSite,
      page: page(slug, title),
      pageSlug: slug,
    });

    assert.equal(
      seo.title.includes(`Agence de voyages à ${city}`),
      false,
      `${slug} must not compete with the home title intent in ${city}`,
    );
    assert.equal(
      seo.heading.includes(`Agence de voyages à ${city}`),
      false,
      `${slug} must not compete with the home heading intent in ${city}`,
    );
  }
}

test("MSE-25.121 home owns the generic local intent for Nevers and Bois-Colombes", () => {
  assertGenericIntentOwnedByHome("Nevers");
  assertGenericIntentOwnedByHome("Bois-Colombes");
});

test("MSE-25.121 secondary pages expose deterministic intent-specific titles and headings", () => {
  const currentSite = site("Nevers");

  const cases = [
    ["agence", "Présentation de Mondescale à Nevers | Mondescale", "Découvrez notre agence à Nevers"],
    ["equipe", "Conseillers voyage à Nevers | Mondescale", "Vos conseillers voyage à Nevers"],
    ["services", "Services voyage & billetterie à Nevers | Mondescale", "Services voyage et billetterie à Nevers"],
    ["avis", "Avis clients à Nevers | Mondescale", "Avis de nos voyageurs à Nevers"],
    ["engagements", "Accompagnement voyage à Nevers | Mondescale", "Notre accompagnement voyage à Nevers"],
    ["contact", "Contacter Mondescale à Nevers | Mondescale", "Nous contacter à Nevers"],
  ];

  for (const [slug, expectedTitle, expectedHeading] of cases) {
    const seo = buildLocalPageSeo({
      site: currentSite,
      page: page(slug, slug),
      pageSlug: slug,
    });
    assert.equal(seo.title, expectedTitle);
    assert.equal(seo.heading, expectedHeading);
  }
});

test("MSE-25.121 rendered shared hero H1 follows the same intent ownership", () => {
  const heroSource = fs.readFileSync(
    new URL("../components/public-site/renderers/HeroV2Renderer.js", import.meta.url),
    "utf8",
  );

  assert.match(heroSource, /return `Agence de voyages à \$\{city\}`/);
  assert.match(heroSource, /return `Découvrez notre agence à \$\{city\}`/);
  assert.match(heroSource, /return `Vos conseillers voyage à \$\{city\}`/);
  assert.match(heroSource, /return `Services voyage et billetterie à \$\{city\}`/);
  assert.match(heroSource, /return `Avis de nos voyageurs à \$\{city\}`/);
  assert.match(heroSource, /return `Notre accompagnement voyage à \$\{city\}`/);
  assert.match(heroSource, /return `Nous contacter à \$\{city\}`/);

  assert.doesNotMatch(heroSource, /Services de votre agence de voyages à \$\{city\}/);
  assert.doesNotMatch(heroSource, /Contacter votre agence de voyages à \$\{city\}/);
  assert.doesNotMatch(heroSource, /Avis clients de votre agence de voyages à \$\{city\}/);
});

test("MSE-25.121 internal linking sends the generic local anchor back to the home", () => {
  const contextSource = fs.readFileSync(
    new URL("../components/public-site/LocalContentContext.js", import.meta.url),
    "utf8",
  );

  assert.match(contextSource, /<Link href=\{root\}>Agence de voyages à \{city\}<\/Link>/);
  assert.match(contextSource, /Services voyage et billetterie à \{city\}/);
  assert.match(contextSource, /Destinations et voyages depuis \{city\}/);
  assert.match(contextSource, /Inspirations voyage depuis \{city\}/);
  assert.match(contextSource, /Nous contacter à \{city\}/);
  assert.doesNotMatch(contextSource, /Services de notre agence de voyages à \{city\}/);
  assert.doesNotMatch(contextSource, /Contacter notre agence de voyages à \{city\}/);
});

test("MSE-25.121 keeps valid local SEO overrides", () => {
  const currentSite = site("Bois-Colombes");
  const seo = buildLocalPageSeo({
    site: currentSite,
    page: page("services", "Services", {
      seoTitle: "Billetterie et services voyage à Bois-Colombes | Mondescale",
      metaDescription: "Billetterie, conseils et services voyage à Bois-Colombes avec Mondescale.",
    }),
    pageSlug: "services",
  });

  assert.equal(
    seo.title,
    "Billetterie et services voyage à Bois-Colombes | Mondescale",
  );
  assert.equal(
    seo.description,
    "Billetterie, conseils et services voyage à Bois-Colombes avec Mondescale.",
  );
});
