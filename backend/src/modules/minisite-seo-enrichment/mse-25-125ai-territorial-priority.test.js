"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  configuredTargetCities,
  resolvedTargetCities,
} = require("./local-area-context");

const {
  buildLocalAreaContent,
} = require("./local-differentiator");

const site = {
  slug: "ambassade-fram-mondescale-bois-colombes",
  agency: {
    id: 6,
    name: "Ambassade FRAM - Mondescale Bois-Colombes",
    city: "Bois-Colombes",
  },
};

test("MSE-25.125AI keeps Ranking Grid Wave 1 territories first", () => {
  assert.deepEqual(
    configuredTargetCities(site).slice(0, 4),
    [
      "Levallois-Perret",
      "Asnières-sur-Seine",
      "Clichy",
      "Neuilly-sur-Seine",
    ]
  );
});

test("MSE-25.125AI resolved SEO context contains all Wave 1 territories", () => {
  const cities = resolvedTargetCities(site, { limit: 5 });

  for (const city of [
    "Levallois-Perret",
    "Asnières-sur-Seine",
    "Clichy",
    "Neuilly-sur-Seine",
  ]) {
    assert.ok(cities.includes(city), `${city} missing`);
  }
});

test("MSE-25.125AI generated local copy uses critical territories without doorway pages", () => {
  const cities = resolvedTargetCities(site, { limit: 5 });

  const content = buildLocalAreaContent({
    agency: site.agency,
    page: {
      slug: "services",
      title: "Nos services",
      pageType: "services",
      published: true,
    },
    targetCities: cities,
  });

  assert.ok(content);
  assert.match(content.html, /Levallois-Perret/);
  assert.match(content.html, /Asnières-sur-Seine/);
  assert.match(content.html, /Clichy/);

  assert.doesNotMatch(
    content.html,
    /agence (?:située|implantée|présente) à Levallois-Perret/i
  );
});

test("MSE-25.125AI does not change another agency context", () => {
  const dax = {
    slug: "ambassade-fram-mondescale-dax",
    agency: { city: "Dax" },
  };

  assert.deepEqual(
    configuredTargetCities(dax),
    [
      "Saint-Paul-lès-Dax",
      "Narrosse",
      "Yzosse",
      "Tercis-les-Bains",
      "Seyresse",
    ]
  );
});
