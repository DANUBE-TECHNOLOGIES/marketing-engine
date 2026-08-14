import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL("../lib/seo/local-page-seo.js", import.meta.url),
  "utf8"
);

test("local SEO gives each major page a distinct search intent", () => {
  assert.match(source, /Agence de voyages à \$\{city\}/);
  assert.match(source, /Services de voyage à \$\{city\}/);
  assert.match(source, /Destinations & voyages depuis \$\{city\}/);
  assert.match(source, /Idées voyage & inspirations à \$\{city\}/);
  assert.match(source, /Avis clients de votre agence à \$\{city\}/);
  assert.match(source, /Agence de voyages à \$\{city\} : contact/);
});

test("offers remain local without claiming departures from the agency city", () => {
  assert.match(source, /Offres de voyages à \$\{city\}/);
  assert.doesNotMatch(source, /Offres de voyages au départ de \$\{city\}/);
});

test("generated descriptions are length-capped and carry local area signals", () => {
  assert.match(source, /MAX_DESCRIPTION_LENGTH = 165/);
  assert.match(source, /areaPhrase\(site\)/);
  assert.match(source, /resolvedTargetCities/);
});
