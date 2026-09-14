import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const selection = readFileSync(new URL("../components/page-builder/shared/agencyPartnerSelection.js", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../components/public-site/renderers/PartnerDirectoryRenderer.js", import.meta.url), "utf8");
const schema = readFileSync(new URL("../lib/seo/partner-directory-schema.js", import.meta.url), "utf8");

test("MSE-25.148 visible and GEO agency selections share the same resolver", () => {
  assert.match(renderer, /selectedAgencyPartners\(site, \{ max: 3 \}\)/);
  assert.match(selection, /resolveAgencyPartnerCandidates\(findAgencyPartnerSelection\(site\)\)/);
  assert.match(selection, /selectAgencyPartners\(candidates, \{ networkItems, max \}\)/);
});

test("MSE-25.148 GEO only promotes verified catalog-backed agency selections", () => {
  assert.match(selection, /partner\?\.source === "catalog"/);
  assert.match(selection, /partner\?\.catalogPartnerId/);
  assert.match(schema, /verifiedCatalogAgencyPartners\(site, \{ max: 3 \}\)/);
  assert.match(schema, /entryIds\.has\(clean\(partner\.catalogPartnerId\)\)/);
});

test("MSE-25.148 models selection as an ItemList about the local TravelAgency", () => {
  assert.match(schema, /#agency-partner-selection/);
  assert.match(schema, /"@type": "ItemList"/);
  assert.match(schema, /about: \{/);
  assert.match(schema, /"@type": "TravelAgency"/);
  assert.match(schema, /#travel-agency/);
  assert.match(schema, /#partner-/);
  assert.doesNotMatch(schema, /knowsAbout/);
  assert.doesNotMatch(schema, /memberOf|sponsor|owns|brand:/);
  assert.doesNotMatch(schema, /offers|price|availability|booking/i);
});
