import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pageSource = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/GroupTravelPage.js"),
  "utf8",
);
const routeSource = fs.readFileSync(
  path.join(process.cwd(), "app/agence/[siteSlug]/voyages-en-groupe/page.js"),
  "utf8",
);

test("MSE-25.196 removes unsupported Group Travel offers and lifecycle claims", () => {
  const combined = `${pageSource}\n${routeSource}`;
  assert.doesNotMatch(combined, /demande-devis/);
  assert.doesNotMatch(combined, /interlocuteur unique/i);
  assert.doesNotMatch(combined, /proposition adaptée/i);
  assert.doesNotMatch(combined, /De la première idée jusqu’au départ/i);
  assert.doesNotMatch(combined, /nous adaptons/i);
  assert.doesNotMatch(combined, /nous construisons/i);
  assert.doesNotMatch(combined, /associations.*CSE.*collectivités/i);
});

test("MSE-25.196 removes synthetic destination inspirations and durations", () => {
  assert.doesNotMatch(pageSource, /Albanie|Grèce|Afrique australe|Méditerranée/i);
  assert.doesNotMatch(pageSource, /Safari|Croisière|Circuit|Week-end/i);
  assert.doesNotMatch(pageSource, /8 jours \/ 7 nuits|7 à 10 nuits|10 à 14 jours|3 à 4 jours/i);
});

test("MSE-25.196 Group Travel navigation reuses published pages only", () => {
  assert.match(pageSource, /uniquePublishedNavigation\(site\)/);
  assert.match(pageSource, /publishedPageBySlug\(pages, "contact"\)/);
  assert.match(pageSource, /publishedPageBySlug\(pages, "services"\)/);
  assert.match(pageSource, /publishedPageBySlug\(pages, "destinations"\)/);
  assert.match(pageSource, /pageHref\(site\.slug, page\)/);
  assert.doesNotMatch(pageSource, /const root =/);
});

test("MSE-25.196 keeps the managed route canonical and indexable with factual metadata", () => {
  assert.match(routeSource, /return `\$\{rootPath\(siteSlug\)\}\/voyages-en-groupe`/);
  assert.match(routeSource, /alternates: \{ canonical \}/);
  assert.match(routeSource, /robots: \{ index: true, follow: true \}/);
  assert.match(routeSource, /Informations publiques et coordonnées/);
  assert.doesNotMatch(routeSource, /organise vos voyages de groupe sur mesure/i);
  assert.doesNotMatch(routeSource, /séjours, circuits, croisières/i);
  assert.doesNotMatch(routeSource, /accompagnement de proximité/i);
});

test("MSE-25.196 renders only grounded agency contact facts", () => {
  assert.match(pageSource, /agency\.phone \?/);
  assert.match(pageSource, /agency\.email \?/);
  assert.match(pageSource, /Les prestations, destinations, capacités et conditions disponibles pour les voyages en groupe peuvent varier/);
});
