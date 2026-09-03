import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schema = await readFile(
  new URL("../lib/seo/json-ld.js", import.meta.url),
  "utf8"
);

test("TravelAgency schema carries local business identity", () => {
  assert.match(schema, /\["TravelAgency", "LocalBusiness"\]/);
  assert.match(schema, /PostalAddress/);
  assert.match(schema, /GeoCoordinates/);
  assert.match(schema, /openingHoursSpecification/);
  assert.match(schema, /areaServed/);
});

test("TravelAgency schema can reconcile important local profiles", () => {
  assert.match(schema, /googleBusinessUrl/);
  assert.match(schema, /googleMapsUrl/);
  assert.match(schema, /googleReviewUrl/);
  assert.match(schema, /facebookUrl/);
  assert.match(schema, /instagramUrl/);
});

test("French local phone numbers are normalized for structured data", () => {
  assert.match(schema, /normalizeFrenchPhone/);
  assert.match(schema, /\+33\$\{compact\.slice\(1\)\}/);
  assert.match(schema, /telephone: normalizeFrenchPhone/);
});

test("destination provider references the canonical local agency entity", () => {
  assert.match(schema, /#travel-agency/);
  assert.match(schema, /provider:/);
});
