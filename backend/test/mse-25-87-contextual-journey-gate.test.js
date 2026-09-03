"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const {
  agencyRoot,
  contextualJourneyHtml,
  expectsContextualJourney,
  inspectPage,
  isAgencyHome,
  isDestinationLanding,
} = require("../scripts/mse-25-87-contextual-journey-gate");

const ROOT = path.resolve(__dirname, "../..");

function source(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("MSE-25.87 scopes contextual journeys to secondary agency pages", () => {
  const root = "https://agences.mondescale.com/agence/example";
  assert.equal(agencyRoot(`${root}/services`), root);
  assert.equal(isAgencyHome(root), true);
  assert.equal(expectsContextualJourney(root), false);
  assert.equal(expectsContextualJourney(`${root}/services`), true);
  assert.equal(isDestinationLanding(`${root}/destination/maldives`), true);
  assert.equal(expectsContextualJourney(`${root}/destination/maldives`), false);
});

test("MSE-25.87 accepts two or three same-agency contextual links", () => {
  const url = "https://agences.mondescale.com/agence/example/services";
  const html = `
    <section data-contextual-journey="content">
      <a href="/agence/example/destinations">Destinations</a>
      <a href="/agence/example/equipe">Équipe</a>
      <a href="/agence/example/contact">Contact</a>
    </section>`;
  assert.ok(contextualJourneyHtml(html));
  const result = inspectPage({ url, status: 200, html });
  assert.equal(result.ok, true);
  assert.equal(result.linkCount, 3);
});

test("MSE-25.87 rejects missing, duplicate, self and cross-agency journeys", () => {
  const url = "https://agences.mondescale.com/agence/example/services";
  const missing = inspectPage({ url, status: 200, html: "<main></main>" });
  assert.ok(missing.issues.includes("contextual-journey-missing"));

  const bad = inspectPage({
    url,
    status: 200,
    html: `<section data-contextual-journey="content">
      <a href="/agence/example/services">Self</a>
      <a href="/agence/other/contact">Other</a>
      <a href="/agence/other/contact">Other duplicate</a>
    </section>`,
  });
  assert.ok(bad.issues.includes("duplicate-contextual-links"));
  assert.ok(bad.issues.includes("self-contextual-link"));
  assert.ok(bad.issues.includes("cross-agency-contextual-link"));
});

test("MSE-25.87 component uses published navigation and limits the journey to three links", () => {
  const component = source("frontend/components/public-site/PublicContextualJourney.js");
  assert.match(component, /uniquePublishedNavigation\(site\)/);
  assert.match(component, /slug !== current/);
  assert.match(component, /contextualJourneyItems\(site, currentSlug, 3\)/);
  assert.match(component, /data-contextual-journey="content"/);
});

test("MSE-25.87 is connected after local context and before reassurance without loading the home", () => {
  const page = source("frontend/app/agence/[siteSlug]/[[...pageSlug]]/page.js");
  const contextIndex = page.indexOf("<LocalContentContext");
  const journeyIndex = page.indexOf("<PublicContextualJourney");
  const reassuranceIndex = page.indexOf("<PublicReassuranceBand");
  assert.ok(contextIndex >= 0 && journeyIndex > contextIndex && reassuranceIndex > journeyIndex);
  assert.match(page, /!legalPage && !isHomePage\(pageSlug\).*PublicContextualJourney/s);
});
