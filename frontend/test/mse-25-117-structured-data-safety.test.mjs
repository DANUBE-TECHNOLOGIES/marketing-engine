import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");

test("MSE-25.117 structured data never fabricates ratings or reviews", () => {
  assert.doesNotMatch(source, /aggregateRating\s*:/);
  assert.doesNotMatch(source, /reviewRating\s*:/);
  assert.doesNotMatch(source, /ratingValue\s*:/);
});

test("MSE-25.117 TravelAgency schema uses available agency data", () => {
  assert.match(source, /agency\.phone \|\| site\.phone/);
  assert.match(source, /agency\.address \|\| site\.address/);
  assert.match(source, /agency\.postalCode \|\| site\.postalCode/);
  assert.match(source, /agency\.city \|\| site\.city/);
});
