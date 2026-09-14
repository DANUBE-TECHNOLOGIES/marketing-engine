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

test("published destination highlights are structured as factual PropertyValue entries", () => {
  assert.match(jsonLdSource, /function destinationHighlightProperties/);
  assert.match(jsonLdSource, /name: "Point fort"/);
  assert.match(jsonLdSource, /\.\.\.destinationHighlightProperties\(destination\)/);
});

test("highlight extraction remains grounded in the same visible destination.highlights field", () => {
  assert.match(jsonLdSource, /Array\.isArray\(destination\?\.highlights\)/);
  assert.match(destinationPageSource, /Array\.isArray\(d\.highlights\)/);
  assert.match(destinationPageSource, /d\.highlights\.map/);
});

test("highlight structuring deduplicates, bounds output and adds no commercial authority", () => {
  assert.match(jsonLdSource, /const seen = new Set\(\)/);
  assert.match(jsonLdSource, /\.slice\(0, 12\)/);
  const helper = jsonLdSource.slice(
    jsonLdSource.indexOf("export function destinationHighlightProperties"),
    jsonLdSource.indexOf("export function buildTravelAgencySchema")
  );
  assert.doesNotMatch(helper, /price|availability|stock|knowsAbout|expertise/i);
});
