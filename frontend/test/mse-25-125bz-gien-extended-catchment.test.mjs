import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const config = fs.readFileSync(
  new URL("../lib/seo/local-area-config.js", import.meta.url),
  "utf8",
);
const area = fs.readFileSync(
  new URL("../components/public-site/LocalSeoAreaLinks.js", import.meta.url),
  "utf8",
);
const metadata = fs.readFileSync(
  new URL("../lib/seo/local-page-seo.js", import.meta.url),
  "utf8",
);

test("Gien keeps its strong core and exposes a distinct extended catchment", () => {
  for (const city of [
    "Poilly-lez-Gien",
    "Briare",
    "Châtillon-sur-Loire",
    "Saint-Brisson-sur-Loire",
    "Sully-sur-Loire",
  ]) assert.match(config, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  for (const city of [
    "Saint-Martin-sur-Ocre",
    "Nevoy",
    "Coullons",
    "Boismorand",
  ]) assert.match(config, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(area, /resolvedExtendedTargetCities/);
  assert.match(area, /Une zone locale élargie est également présentée/);
  assert.match(area, /sans modifier l’adresse d’implantation de l’agence/);
  assert.doesNotMatch(metadata, /resolvedExtendedTargetCities/);
  assert.match(metadata, /resolvedTargetCities\(site, \{ limit: 4 \}\)/);
});

test("Gien extended catchment does not overlap the Amilly core or create provider hooks", () => {
  const gienExtended = config.match(/"ambassade-fram-mondescale-gien": \[\n([\s\S]*?)\n  \],\n  "ambassade-fram-mondescale-maurepas"/);
  assert.ok(gienExtended);
  for (const city of ["Montargis", "Villemandeur", "Châlette-sur-Loing", "Pannes", "Cepoy"]) {
    assert.doesNotMatch(gienExtended[1], new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(config, /RANKING_GRID_DATAFORSEO_ENABLED/);
  assert.doesNotMatch(config, /DataForSEO/);
});
