import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const config = fs.readFileSync(
  new URL("../lib/seo/ozoir-local-expansion.js", import.meta.url),
  "utf8"
);

const areas = fs.readFileSync(
  new URL("../lib/seo/local-area-config.js", import.meta.url),
  "utf8"
);

const component = fs.readFileSync(
  new URL("../components/public-site/OzoirLocalExpansion.jsx", import.meta.url),
  "utf8"
);

const route = fs.readFileSync(
  new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url),
  "utf8"
);

test("Ozoir expansion targets the five strategic core cities", () => {
  for (const city of [
    "Pontault-Combault",
    "Roissy-en-Brie",
    "Gretz-Armainvilliers",
    "Tournan-en-Brie",
    "Lésigny",
  ]) {
    assert.match(config, new RegExp(city));
    assert.match(areas, new RegExp(city));
  }
});

test("Ozoir expansion adds the secondary catchment without fake locations", () => {
  for (const city of [
    "Férolles-Attilly",
    "Servon",
    "Chevry-Cossigny",
  ]) {
    assert.match(areas, new RegExp(city));
  }

  assert.doesNotMatch(component, /PostalAddress/);
  assert.doesNotMatch(component, /GeoCoordinates/);
  assert.doesNotMatch(component, /LocalBusiness/);
});

test("Ozoir expansion explicitly preserves the physical Ozoir agency", () => {
  assert.match(config, /Ozoir-la-Ferrière/);
  assert.match(config, /agence physique à Ozoir-la-Ferrière/);
});

test("Ozoir expansion covers commercial acquisition intents", () => {
  for (const intent of [
    "croisières",
    "voyages sur mesure",
    "billetterie",
    "FRAM",
    "Framissima",
  ]) {
    assert.match(config, new RegExp(intent, "i"));
  }
});

test("Ozoir expansion exposes phone and contact conversion paths", () => {
  assert.match(component, /tel:/);
  assert.match(component, /contact/);
  assert.match(component, /services/);
  assert.match(component, /destinations/);
});

test("Ozoir expansion is wired into the canonical public route", () => {
  assert.match(route, /OzoirLocalExpansion/);
});
