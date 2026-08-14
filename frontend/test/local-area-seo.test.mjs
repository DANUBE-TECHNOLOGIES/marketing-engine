import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const areaConfig = await readFile(
  new URL("../lib/seo/local-area-config.js", import.meta.url),
  "utf8"
);
const jsonLd = await readFile(
  new URL("../lib/seo/json-ld.js", import.meta.url),
  "utf8"
);
const areaLinks = await readFile(
  new URL("../components/public-site/LocalSeoAreaLinks.js", import.meta.url),
  "utf8"
);
const destinationPage = await readFile(
  new URL("../components/destination/DestinationPage.js", import.meta.url),
  "utf8"
);

test("local area fallback covers the principal Mondescale agencies", () => {
  for (const slug of [
    "ambassade-fram-mondescale-bois-colombes",
    "ambassade-fram-mondescale-dax",
    "ambassade-fram-mondescale-gien",
    "ambassade-fram-mondescale-maurepas",
    "ambassade-fram-mondescale-nevers",
    "ambassade-fram-mondescale-ozoir-la-ferriere",
    "mondescale-lamorlaye",
  ]) {
    assert.match(areaConfig, new RegExp(`"${slug}"`));
  }
});

test("visible local area links use the same resolved target cities as metadata", () => {
  assert.match(areaLinks, /resolvedTargetCities/);
  assert.match(areaLinks, /\/services/);
  assert.match(areaLinks, /\/destinations/);
  assert.match(areaLinks, /\/inspiration/);
  assert.match(areaLinks, /\/contact/);
});

test("TravelAgency structured data exposes resolved service areas", () => {
  assert.match(jsonLd, /resolvedTargetCities/);
  assert.match(jsonLd, /areaServed:\s*servedAreas/);
  assert.match(jsonLd, /"@type": "City"/);
});

test("destination pages reinforce the local hub without creating city doorway URLs", () => {
  assert.match(destinationPage, /resolvedTargetCities/);
  assert.match(destinationPage, /Voyage à \$\{d\.name\} depuis \$\{city\}/);
  assert.match(destinationPage, /destinationsPath/);
  assert.match(destinationPage, /servicesPath/);
  assert.match(destinationPage, /inspirationsPath/);
  assert.match(destinationPage, /contactPath/);
});
