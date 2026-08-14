import test from "node:test";
import assert from "node:assert/strict";
import { aggregateLocalSeoSite, scoreLocalSeoPage } from "../lib/seo/local-seo-score.mjs";

const strong = {
  url: "https://agences.mondescale.com/agence/gien",
  pageKind: "home",
  title: "Agence de voyages à Gien | Mondescale",
  description: "Une description locale complète.",
  canonical: "https://agences.mondescale.com/agence/gien",
  robots: "index,follow",
  h1: "Agence de voyages à Gien",
  h1Count: 1,
  ogTitle: "Agence de voyages à Gien | Mondescale",
  ogDescription: "Une description locale complète.",
  ogImage: "/media/hero.jpg",
  hasTravelAgency: true,
  hasWebPage: true,
  hasBreadcrumb: true,
  hasPrimaryImage: true,
  hasAgencyImage: true,
  hasAgencyLogo: true,
  hasAreaServed: true,
  hasNap: true,
  city: "Gien",
  cityInTitle: true,
  cityInH1: true,
  cityInText: true,
  localSignalRequired: true,
  wordCount: 320,
};

test("une page locale complète atteint un score A", () => {
  const score = scoreLocalSeoPage(strong);
  assert.equal(score.total, 100);
  assert.equal(score.grade, "A");
  assert.deepEqual(score.dimensions, {
    technical: 30,
    local: 30,
    content: 25,
    media: 15,
  });
});

test("une page pauvre et sans signaux locaux est pénalisée", () => {
  const score = scoreLocalSeoPage({
    url: "https://agences.mondescale.com/agence/test/services",
    pageKind: "services",
    title: "Services",
    canonical: "https://agences.mondescale.com/agence/test/services",
    h1: "Services",
    h1Count: 1,
    wordCount: 35,
    localSignalRequired: true,
  });
  assert.ok(score.total < 55);
  assert.equal(score.grade, "E");
  assert.ok(score.dimensions.local < 10);
});

test("les pages destination ne sont pas pénalisées pour absence de ville dans le H1", () => {
  const score = scoreLocalSeoPage({
    ...strong,
    pageKind: "destination-detail",
    localSignalRequired: false,
    cityInTitle: false,
    cityInH1: false,
    cityInText: false,
  });
  assert.equal(score.dimensions.local, 30);
});

test("le score agence donne plus de poids à l'accueil", () => {
  const home = { ...strong, pageKind: "home" };
  const weak = {
    ...strong,
    pageKind: "destinations",
    hasNap: false,
    hasAreaServed: false,
    wordCount: 60,
    cityInText: false,
  };
  const result = aggregateLocalSeoSite([home, weak]);
  assert.ok(result.total > scoreLocalSeoPage(weak).total);
  assert.equal(result.pages, 2);
});
