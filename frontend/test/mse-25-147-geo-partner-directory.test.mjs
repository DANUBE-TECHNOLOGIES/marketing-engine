import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const schema = readFileSync(new URL("../lib/seo/partner-directory-schema.js", import.meta.url), "utf8");
const route = readFileSync(new URL("../app/agence/[siteSlug]/[[...pageSlug]]/page.js", import.meta.url), "utf8");
const profile = readFileSync(new URL("../components/page-builder/shared/partnerProfile.js", import.meta.url), "utf8");

test("MSE-25.147 partner GEO uses the same publication gate as the visible directory", () => {
  assert.match(schema, /getPartnerDirectoryCategories/);
  assert.match(schema, /getPublishablePartnerProfiles\(category\.partners\)/);
  assert.match(profile, /identityConfirmed && summary\.length >= 45/);
  assert.match(profile, /destinations\.length >= 2 && travelTypes\.length >= 2/);
});

test("MSE-25.147 exposes partners as a collection of organizations without commercial inference", () => {
  assert.match(schema, /"@type": "CollectionPage"/);
  assert.match(schema, /"@type": "ItemList"/);
  assert.match(schema, /"@type": "Organization"/);
  assert.match(schema, /#partner-/);
  assert.doesNotMatch(schema, /knowsAbout/);
  assert.doesNotMatch(schema, /offers|price|availability|booking/i);
});

test("MSE-25.147 only emits the directory graph on partner pages", () => {
  assert.match(route, /function isPartnersPage/);
  assert.match(route, /partnersPage \? buildPartnerDirectorySchemas/);
  assert.match(route, /partnerDirectorySchemas\.map/);
});
