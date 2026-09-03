import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

test("MSE-25.117 local search contract covers commercial local intents", () => {
  const source = read("lib/seo/local-search-intent.js");
  for (const expected of [
    "agence de voyage",
    "voyage sur mesure",
    "billet avion",
    "voyage en groupe",
    "voyage d'affaires",
  ]) assert.match(source, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(source, /agency\?\.city\s*\|\|\s*site\?\.city/);
});

test("MSE-25.117 keeps local metadata deterministic and city-qualified", () => {
  const source = read("lib/seo/local-page-seo.js");
  assert.match(source, /Agence de voyages à \$\{city\}/);
  assert.match(source, /preferLocalOverride/);
  assert.match(source, /containsLocalSignal/);
});

test("MSE-25.117 structured data exposes a real local TravelAgency graph", () => {
  const source = read("lib/seo/json-ld.js");
  assert.match(source, /\["TravelAgency", "LocalBusiness"\]/);
  assert.match(source, /PostalAddress/);
  assert.match(source, /telephone: phone/);
  assert.match(source, /areaServed: servedAreas/);
  assert.match(source, /hasMap/);
});

test("MSE-25.117 does not introduce doorway city routes", () => {
  const sitemap = read("app/sitemap.js");
  assert.doesNotMatch(sitemap, /targetCities.*map.*url/s);
  assert.doesNotMatch(sitemap, /nearby.*map.*url/s);
});
