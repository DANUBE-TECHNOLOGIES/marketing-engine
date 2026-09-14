import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const jsonLd = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");

test("MSE-25.126 agency entity and canonical WebPage are linked bidirectionally", () => {
  assert.match(jsonLd, /function webPageEntityReference/);
  assert.match(jsonLd, /mainEntityOfPage: webPageEntityReference\(site\.basePath\)/);
  assert.match(jsonLd, /mainEntity: agency/);
});

test("MSE-25.126 public local pages attribute publication to the exact local agency entity", () => {
  assert.match(jsonLd, /function agencyEntityReference/);
  assert.match(jsonLd, /publisher: agency/);
  assert.match(jsonLd, /"@id": `\$\{absoluteUrl\(site\.basePath\)\}#travel-agency`/);
});

test("MSE-25.126 destination graph links WebPage, TouristDestination and TravelAgency without invented expertise", () => {
  assert.match(jsonLd, /mainEntityOfPage: webPageEntityReference\(data\.canonicalPath\)/);
  assert.match(jsonLd, /publisher: agency/);
  assert.match(jsonLd, /about: \[destinationEntity, agency\]/);
  assert.match(jsonLd, /mainEntity: destinationEntity/);
  assert.doesNotMatch(jsonLd, /knowsAbout:/);
});
