import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const pageSource = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/BusinessTravelPage.js"),
  "utf8",
);
const routeSource = fs.readFileSync(
  path.join(process.cwd(), "app/agence/[siteSlug]/business-travel/page.js"),
  "utf8",
);

test("MSE-25.195 removes unsupported Business Travel capability claims", () => {
  const combined = `${pageSource}\n${routeSource}`;
  assert.doesNotMatch(combined, /tarifs négociés/i);
  assert.doesNotMatch(combined, /24h\/24|7j\/7/i);
  assert.doesNotMatch(combined, /géolocalisation/i);
  assert.doesNotMatch(combined, /reporting et pilotage/i);
  assert.doesNotMatch(combined, /paiements centralisés/i);
  assert.doesNotMatch(combined, /application mobile/i);
  assert.doesNotMatch(combined, /accompagnés de A à Z/i);
  assert.doesNotMatch(combined, /organise, optimise et sécurise/i);
});

test("MSE-25.195 Business Travel navigation reuses published pages only", () => {
  assert.match(pageSource, /uniquePublishedNavigation\(site\)/);
  assert.match(pageSource, /publishedPageBySlug\(pages, "contact"\)/);
  assert.match(pageSource, /publishedPageBySlug\(pages, "services"\)/);
  assert.match(pageSource, /pageHref\(site\.slug, page\)/);
  assert.doesNotMatch(pageSource, /demande-devis/);
  assert.doesNotMatch(pageSource, /`\$\{root\}\/services`/);
});

test("MSE-25.195 keeps the managed route canonical and indexable without invented service metadata", () => {
  assert.match(routeSource, /return `\/agence\/\$\{siteSlug\}\/business-travel`/);
  assert.match(routeSource, /alternates: \{ canonical \}/);
  assert.match(routeSource, /robots: \{ index: true, follow: true \}/);
  assert.match(routeSource, /Informations publiques et coordonnées/);
  assert.doesNotMatch(routeSource, /transport, hébergement, assistance, suivi et pilotage/i);
});

test("MSE-25.195 renders only grounded agency contact facts", () => {
  assert.match(pageSource, /agency\.phone \?/);
  assert.match(pageSource, /agency\.email \?/);
  assert.match(pageSource, /Les prestations, conditions et dispositifs disponibles pour les voyages d’affaires peuvent varier/);
});
