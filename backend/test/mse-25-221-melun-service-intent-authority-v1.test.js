"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  require("node:path").join(__dirname, "../scripts/mse-25-221-melun-service-intent-authority-v1.js"),
  "utf8"
);

test("targets Melun agency 8 and preserves current public brand", () => {
  assert.match(source, /TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(source, /EXPECTED_AGENCY_ID = 8/);
  assert.match(source, /Ambassade FRAM/);
});

test("requires the validated MSE-25.220 predecessor blocks", () => {
  for (const id of [
    "mse25220melunagencyfaq",
    "mse25220melunservicesfaq",
    "mse25220melundestinationsfaq",
    "mse25220meluncontactfaq",
  ]) assert.match(source, new RegExp(id));
});

test("creates four service intent rich text blocks", () => {
  for (const id of [
    "mse25221melunserviceair",
    "mse25221melunserviceformats",
    "mse25221melunserviceprofiles",
    "mse25221melunservicecompare",
  ]) assert.match(source, new RegExp(id));
  assert.match(source, /blockType: "rich_text"/);
  assert.match(source, /serviceIntentClusters/);
});

test("covers priority service intents without fabricated promises", () => {
  assert.match(source, /Billetterie et vols/);
  assert.match(source, /Circuit, autotour, club ou croisière/);
  assert.match(source, /Sur mesure, famille, voyage de noces ou groupe/);
  assert.match(source, /Comment comparer deux propositions de voyage/);
});

test("keeps internal journey to destinations and contact", () => {
  assert.match(source, /\/agence\/tui-store-melun\/destinations/);
  assert.match(source, /\/agence\/tui-store-melun\/contact/);
});

test("mutation is guarded and does not rewrite routes, agency or SEO", () => {
  assert.match(source, /MSE_25_221_CONFIRM/);
  assert.match(source, /MSE_25_221_ROLLBACK/);
  assert.match(source, /guardFingerprint\(justBefore\.site\) !== fingerprint/);
  assert.match(source, /rollback automatique effectué/);
  assert.match(source, /routeWrites: 0/);
  assert.match(source, /agencyWrites: 0/);
  assert.match(source, /pageSeoWrites: 0/);
});
