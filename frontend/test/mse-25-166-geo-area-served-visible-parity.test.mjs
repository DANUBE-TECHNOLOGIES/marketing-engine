import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const config = read("lib/seo/local-area-config.js");
const jsonLd = read("lib/seo/json-ld.js");
const referenceFacts = read("components/public-site/PublicAgencyReferenceFacts.js");
const areaLinks = read("components/public-site/LocalSeoAreaLinks.js");

test("MSE-25.166 one public target-city boundary caps every resolved local area", () => {
  assert.match(config, /const PUBLIC_TARGET_CITY_LIMIT = 6/);
  assert.match(config, /Math\.min\(\s*PUBLIC_TARGET_CITY_LIMIT,/);
  assert.match(config, /return result\.slice\(0, publicLimit\)/);
});

test("MSE-25.166 TravelAgency areaServed cannot exceed the visible canonical target set", () => {
  assert.match(jsonLd, /resolvedTargetCities\(site, \{ limit: 12 \}\)/);
  assert.match(jsonLd, /areaServed: servedAreas\(site, agency\)/);
  assert.match(referenceFacts, /resolvedTargetCities\(site, \{ limit: 6 \}\)/);
  assert.match(referenceFacts, /itemProp="areaServed"/);
  assert.match(areaLinks, /resolvedTargetCities\(site, \{ limit: 6 \}\)/);
});

test("MSE-25.166 extended catchment remains visible copy, not hidden canonical areaServed", () => {
  assert.match(areaLinks, /resolvedExtendedTargetCities/);
  assert.doesNotMatch(jsonLd, /resolvedExtendedTargetCities/);
});

test("MSE-25.166 explicit target cities remain editorial authority and are deduplicated", () => {
  assert.match(config, /explicitTargetCities\(site\)\.length/);
  assert.match(config, /if \(key === primary \|\| seen\.has\(key\)\) continue/);
});
