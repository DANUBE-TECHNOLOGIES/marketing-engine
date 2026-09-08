import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const component = fs.readFileSync(
  path.join(root, "components/public-site/PublicAgencyReferenceFacts.js"),
  "utf8"
);
const localArea = fs.readFileSync(
  path.join(root, "components/public-site/LocalSeoAreaLinks.js"),
  "utf8"
);

test("MSE-25.128 public agency facts use canonical local data only", () => {
  assert.match(component, /site\?\.agency \|\| site/);
  assert.match(component, /resolvedTargetCities\(site, \{ limit: 6 \}\)/);
  assert.match(component, /streetAddress/);
  assert.match(component, /postalCode/);
  assert.match(component, /phone/);
  assert.match(component, /email/);
  assert.doesNotMatch(component, /knowsAbout/);
  assert.doesNotMatch(component, /expert(?:ise|e)?/i);
});

test("MSE-25.128 facts are visible semantic HTML tied to the canonical TravelAgency entity", () => {
  assert.match(component, /data-geo-reference="canonical-agency"/);
  assert.match(component, /itemType="https:\/\/schema\.org\/TravelAgency"/);
  assert.match(component, /#travel-agency/);
  assert.match(component, /<dl>/);
  assert.match(component, /itemProp="address"/);
  assert.match(component, /itemProp="telephone"/);
  assert.match(component, /itemProp="areaServed"/);
  assert.match(localArea, /PublicAgencyReferenceFacts/);
  assert.match(localArea, /<PublicAgencyReferenceFacts site=\{site\} \/>/);
});
