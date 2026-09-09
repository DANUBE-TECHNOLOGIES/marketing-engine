import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const audienceSource = await readFile(
  new URL("../lib/seo/destination-audience.js", import.meta.url),
  "utf8"
);
const destinationPageSource = await readFile(
  new URL("../components/destination/DestinationPage.js", import.meta.url),
  "utf8"
);

test("destination audiences come only from the canonical audiences field", () => {
  assert.match(audienceSource, /Array\.isArray\(destination\?\.audiences\)/);
  assert.doesNotMatch(audienceSource, /destination\?\.(type|summary|tagline|highlights)/);
  assert.doesNotMatch(audienceSource, /score|recommendation|relation/i);
});

test("destination audiences are trimmed, whitespace-normalized and deduplicated without semantic rewriting", () => {
  assert.match(audienceSource, /String\(value \|\| ""\)\.replace\(\/\\s\+\/g, " "\)\.trim\(\)/);
  assert.match(audienceSource, /toLocaleLowerCase\("fr-FR"\)/);
  assert.match(audienceSource, /seen\.has\(key\)/);
  assert.match(audienceSource, /result\.push\(audience\)/);
  assert.match(audienceSource, /result\.slice\(0, 12\)/);
});

test("visible audience pills and TouristDestination touristType use the exact same normalized array", () => {
  assert.match(destinationPageSource, /const audiences = destinationAudiences\(d\)/);
  assert.match(destinationPageSource, /touristType: audiences\.length \? audiences : undefined/);
  assert.match(destinationPageSource, /Idéal pour/);
  assert.match(destinationPageSource, /audiences\.map\(\(audience\) => <span key=\{audience\}>\{audience\}<\/span>\)/);
});

test("empty audiences are omitted from both visible content and structured data", () => {
  assert.match(destinationPageSource, /\{audiences\.length \? \(/);
  assert.match(destinationPageSource, /touristType: audiences\.length \? audiences : undefined/);
});

test("audience parity does not add transactional or inferred expertise claims", () => {
  assert.doesNotMatch(audienceSource, /price|availability|stock|booking|knowsAbout/i);
  assert.doesNotMatch(destinationPageSource, /priceSpecification/);
  assert.doesNotMatch(destinationPageSource, /availability:/);
  assert.doesNotMatch(destinationPageSource, /knowsAbout/);
});
