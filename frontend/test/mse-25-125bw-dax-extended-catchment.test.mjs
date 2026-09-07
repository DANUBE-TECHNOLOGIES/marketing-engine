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

test("Dax keeps its core catchment and exposes a distinct extended catchment", () => {
  for (const city of [
    "Saint-Paul-lès-Dax",
    "Narrosse",
    "Yzosse",
    "Tercis-les-Bains",
    "Seyresse",
  ]) assert.match(config, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  for (const city of [
    "Saint-Vincent-de-Paul",
    "Oeyreluy",
    "Saugnac-et-Cambran",
    "Mées",
  ]) assert.match(config, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(area, /resolvedExtendedTargetCities/);
  assert.match(area, /Au-delà de ce premier cercle/);
  assert.doesNotMatch(metadata, /resolvedExtendedTargetCities/);
  assert.match(metadata, /resolvedTargetCities\(site, \{ limit: 4 \}\)/);
});

test("Dax extended catchment does not create doorway routes or touch ranking provider controls", () => {
  assert.doesNotMatch(config, /href=.*Saint-Vincent-de-Paul/i);
  assert.doesNotMatch(config, /RANKING_GRID_DATAFORSEO_ENABLED/);
  assert.doesNotMatch(config, /DataForSEO/);
});
