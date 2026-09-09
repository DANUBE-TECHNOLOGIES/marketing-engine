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

test("destination practical facts use the same four published fields as the visible page", () => {
  for (const field of ["bestTime", "idealDuration", "language", "currency"]) {
    assert.match(jsonLdSource, new RegExp(`destination\\?\\.${field}`));
    assert.match(destinationPageSource, new RegExp(`d\\.${field}`));
  }

  for (const label of ["Meilleure période", "Durée idéale", "Langue", "Monnaie"]) {
    assert.match(jsonLdSource, new RegExp(label));
    assert.match(destinationPageSource, new RegExp(label));
  }
});

test("destination practical facts are included in additionalProperty as PropertyValue and omitted when empty", () => {
  assert.match(
    jsonLdSource,
    /const additionalProperty\s*=\s*\[[\s\S]*\.\.\.destinationPracticalProperties\(destination\)[\s\S]*\]/
  );
  assert.match(jsonLdSource, /\n\s*additionalProperty,\n/);
  assert.match(jsonLdSource, /"@type": "PropertyValue"/);
  assert.match(jsonLdSource, /filter\(\(\[, value\]\) => value\)/);
});

test("destination practical facts do not add transactional or inferred expertise properties", () => {
  assert.doesNotMatch(jsonLdSource, /priceSpecification/);
  assert.doesNotMatch(jsonLdSource, /availability:/);
  assert.doesNotMatch(jsonLdSource, /knowsAbout/);
});
