import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const jsonLdSource = await readFile(
  new URL("../lib/seo/json-ld.js", import.meta.url),
  "utf8"
);
const destinationPageSource = await readFile(
  new URL("../components/destination/DestinationPage.js", import.meta.url),
  "utf8"
);

test("destination country, region and type semantics come from fields already visible in the hero", () => {
  assert.match(destinationPageSource, /\[d\.country, d\.region, d\.type\]/);
  assert.match(jsonLdSource, /destination\?\.country/);
  assert.match(jsonLdSource, /destination\?\.region/);
  assert.match(jsonLdSource, /destination\?\.type/);
  assert.match(jsonLdSource, /name: "Type de voyage"/);
});

test("destination region is nested as a Place inside the published country", () => {
  assert.match(jsonLdSource, /export function destinationContainedInPlace/);
  assert.match(jsonLdSource, /"@type": "Place"/);
  assert.match(jsonLdSource, /"@type": "Country"/);
  assert.match(jsonLdSource, /containedInPlace: destinationContainedInPlace\(destination\)/);
});

test("hidden audience classifications are not emitted as touristType", () => {
  assert.doesNotMatch(jsonLdSource, /touristType:/);
  assert.doesNotMatch(jsonLdSource, /destination\.audiences/);
});

test("public destination semantics do not add transactional or inferred expertise fields", () => {
  assert.doesNotMatch(jsonLdSource, /priceSpecification/);
  assert.doesNotMatch(jsonLdSource, /availability:/);
  assert.doesNotMatch(jsonLdSource, /knowsAbout/);
});
