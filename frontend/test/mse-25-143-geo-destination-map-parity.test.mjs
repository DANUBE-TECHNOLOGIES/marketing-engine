import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const locationSource = await readFile(
  new URL("../lib/seo/destination-location.js", import.meta.url),
  "utf8"
);
const destinationPageSource = await readFile(
  new URL("../components/destination/DestinationPage.js", import.meta.url),
  "utf8"
);

test("destination coordinates are accepted only when finite and inside WGS84 bounds", () => {
  assert.match(locationSource, /Number\.isFinite\(latitude\)/);
  assert.match(locationSource, /Number\.isFinite\(longitude\)/);
  assert.match(locationSource, /latitude < -90 \|\| latitude > 90/);
  assert.match(locationSource, /longitude < -180 \|\| longitude > 180/);
});

test("destination map URL is derived only from the same validated coordinates", () => {
  assert.match(locationSource, /const coordinates = destinationCoordinates\(destination\)/);
  assert.match(locationSource, /if \(!coordinates\) return null/);
  assert.match(locationSource, /google\.com\/maps\/search\/\?api=1&query=/);
});

test("visible map link and TouristDestination hasMap use the same public map URL", () => {
  assert.match(destinationPageSource, /const mapUrl = destinationMapUrl\(d\)/);
  assert.match(destinationPageSource, /hasMap: mapUrl \|\| undefined/);
  assert.match(destinationPageSource, /<a href=\{mapUrl\} target="_blank" rel="noopener noreferrer">/);
  assert.match(destinationPageSource, /Voir sur la carte/);
});

test("structured destination geo is rebuilt only from validated coordinates", () => {
  assert.match(destinationPageSource, /geo: coordinates/);
  assert.match(destinationPageSource, /latitude: coordinates\.latitude/);
  assert.match(destinationPageSource, /longitude: coordinates\.longitude/);
  assert.match(destinationPageSource, /:\s*undefined,/);
});

test("map parity does not add commercial or inferred expertise claims", () => {
  assert.doesNotMatch(locationSource, /price|availability|stock|booking|knowsAbout/i);
  assert.doesNotMatch(destinationPageSource, /priceSpecification/);
  assert.doesNotMatch(destinationPageSource, /availability:/);
  assert.doesNotMatch(destinationPageSource, /knowsAbout/);
});
