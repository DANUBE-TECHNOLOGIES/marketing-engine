import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relative) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");
const pageSource = read("components/public-site/BusinessTravelPage.js");
const routeSource = read("app/agence/[siteSlug]/business-travel/page.js");
const quoteRouteSource = read("app/agence/[siteSlug]/demande-devis/page.js");
const quoteFormSource = read("components/public-site/SmartQuoteRequest.js");
const featureSource = read("components/public-site/renderers/FeaturesV2Renderer.js");
const heroSource = read("components/public-site/renderers/HeroV2Renderer.js");
const ctaSource = read("components/public-site/renderers/CtaV2Renderer.js");
const groupSource = read("components/public-site/GroupTravelPage.js");

test("MSE-25.195 keeps Business Travel commercially useful without unsupported guarantees", () => {
  const combined = `${pageSource}\n${routeSource}`;
  assert.match(pageSource, /BUSINESS_NEEDS/);
  assert.match(pageSource, /BUSINESS_SERVICES/);
  assert.match(pageSource, /BUSINESS_STEPS/);
  assert.match(pageSource, /Déplacements ponctuels/);
  assert.match(pageSource, /Voyages récurrents/);
  assert.match(pageSource, /Équipes & événements/);
  assert.match(pageSource, /Transport, hébergement et coordination/);
  assert.match(pageSource, /Du besoin professionnel à la réservation/);
  assert.doesNotMatch(combined, /tarifs négociés/i);
  assert.doesNotMatch(combined, /24h\/24|7j\/7/i);
  assert.doesNotMatch(combined, /géolocalisation/i);
  assert.doesNotMatch(combined, /application mobile/i);
});

test("MSE-25.195 uses the real quote route and business source", () => {
  assert.match(quoteRouteSource, /SmartQuoteRequest/);
  assert.match(quoteFormSource, /id="demande-devis"/);
  assert.match(quoteFormSource, /fetch\("\/api\/public-leads"/);
  assert.match(pageSource, /quoteRequestHref\(site, \{ source: "business" \}\)/);
  assert.match(pageSource, /Demander une étude de voyage/);
  assert.match(pageSource, /Présenter mon besoin professionnel/);
});

test("MSE-25.195 managed service cards link to Business Travel and Group Travel", () => {
  assert.match(featureSource, /slug: "business-travel"/);
  assert.match(featureSource, /slug: "voyages-en-groupe"/);
  assert.match(featureSource, /managedFeatureAction\(root, item\)/);
  assert.match(featureSource, /public-site-feature-action/);
});

test("MSE-25.195 conversion CTAs converge on the quote form", () => {
  assert.match(heroSource, /quoteRequestHref\(site/);
  assert.match(heroSource, /label: "Construire mon voyage"/);
  assert.match(ctaSource, /isQuoteCtaLabel\(label\)/);
  assert.match(ctaSource, /quoteRequestHref\(site/);
});

test("MSE-25.195 does not regress Group Travel inspirations", () => {
  assert.match(groupSource, /const TRIPS=/);
  assert.match(groupSource, /id="inspirations"/);
  assert.match(groupSource, /Albanie/);
  assert.match(groupSource, /Grèce/);
  assert.match(groupSource, /Méditerranée/);
  assert.match(groupSource, /Ces propositions sont des inspirations/);
  assert.match(groupSource, /quoteRequestHref\(site,\{source:"group"\}\)|quoteRequestHref\(site, \{ source: "group" \}\)/);
});

test("MSE-25.195 keeps the managed Business Travel route canonical and indexable", () => {
  assert.match(routeSource, /return `\/agence\/\$\{siteSlug\}\/business-travel`/);
  assert.match(routeSource, /alternates: \{ canonical \}/);
  assert.match(routeSource, /robots: \{ index: true, follow: true \}/);
});
