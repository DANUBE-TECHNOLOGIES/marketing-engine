import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const configSource = fs.readFileSync(
  new URL("../lib/seo/local-area-config.js", import.meta.url),
  "utf8",
);
const areaLinksSource = fs.readFileSync(
  new URL("../components/public-site/LocalSeoAreaLinks.js", import.meta.url),
  "utf8",
);
const pageSeoSource = fs.readFileSync(
  new URL("../lib/seo/local-page-seo.js", import.meta.url),
  "utf8",
);

const core = [
  "Élancourt",
  "Coignières",
  "La Verrière",
  "Jouars-Pontchartrain",
  "Le Mesnil-Saint-Denis",
  "Trappes",
];

const extended = [
  "Les Essarts-le-Roi",
  "Plaisir",
  "Montigny-le-Bretonneux",
  "Rambouillet",
];

test("Maurepas keeps separate core and extended catchment tiers", () => {
  for (const city of [...core, ...extended]) {
    assert.ok(configSource.includes(`"${city}"`), `missing Maurepas city: ${city}`);
  }

  assert.equal(new Set(core).size, 6);
  assert.equal(new Set(extended).size, 4);
  assert.deepEqual(core.filter((city) => extended.includes(city)), []);

  assert.match(configSource, /const EXTENDED_LOCAL_AREA_BY_SITE_SLUG = Object\.freeze\(/);
  assert.match(configSource, /export function resolvedExtendedTargetCities/);
});

test("extended catchment is rendered only as a visible home-area signal", () => {
  assert.match(areaLinksSource, /resolvedExtendedTargetCities/);
  assert.match(areaLinksSource, /Une zone locale élargie est également présentée/);
  assert.match(areaLinksSource, /contexte géographique du mini-site/);
  assert.match(areaLinksSource, /sans modifier l’adresse d’implantation de l’agence/);

  assert.doesNotMatch(pageSeoSource, /resolvedExtendedTargetCities/);
  assert.match(pageSeoSource, /resolvedTargetCities\(site, \{ limit: 4 \}\)/);
});

test("BT adds no doorway route and leaves ranking provider untouched", () => {
  assert.doesNotMatch(configSource, /RANKING_GRID_DATAFORSEO_ENABLED/);
  assert.doesNotMatch(areaLinksSource, /RANKING_GRID_DATAFORSEO_ENABLED/);
  assert.doesNotMatch(areaLinksSource, /href=\{`[^`]*Rambouillet/);
});
