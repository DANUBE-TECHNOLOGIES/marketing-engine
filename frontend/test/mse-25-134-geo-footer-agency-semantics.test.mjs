import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const footer = fs.readFileSync(
  path.join(root, "components/public-site/PublicSiteFooter.js"),
  "utf8"
);
const jsonLd = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");

test("MSE-25.134 footer reuses the canonical TravelAgency identity on every public page", () => {
  assert.match(footer, /function canonicalAgencyEntityId\(site\)/);
  assert.match(footer, /#travel-agency/);
  assert.match(footer, /itemType="https:\/\/schema\.org\/TravelAgency"/);
  assert.match(footer, /itemID=\{agencyEntityId\}/);
  assert.match(footer, /data-geo-reference="canonical-agency-footer"/);
  assert.match(jsonLd, /"@id": `\$\{absoluteUrl\(site\.basePath\)\}#travel-agency`/);
});

test("MSE-25.134 visible footer NAP is explicitly machine-readable", () => {
  assert.match(footer, /itemProp="name"/);
  assert.match(footer, /itemProp="address"/);
  assert.match(footer, /itemType="https:\/\/schema\.org\/PostalAddress"/);
  assert.match(footer, /itemProp="streetAddress"/);
  assert.match(footer, /itemProp="postalCode"/);
  assert.match(footer, /itemProp="addressLocality"/);
  assert.match(footer, /itemProp="addressCountry" content="FR"/);
  assert.match(footer, /itemProp="telephone"/);
  assert.match(footer, /itemProp="email"/);
});

test("MSE-25.134 footer semantics do not manufacture expertise or transactional facts", () => {
  assert.doesNotMatch(footer, /knowsAbout|expert(?:ise|e)?|specialist/i);
  assert.doesNotMatch(footer, /price|availability|inventory|stock/i);
});
