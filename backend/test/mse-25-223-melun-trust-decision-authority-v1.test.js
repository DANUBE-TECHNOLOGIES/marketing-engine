"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../scripts/mse-25-223-melun-trust-decision-authority-v1.js"),
  "utf8"
);

test("targets Melun agency 8 and preserves current brand", () => {
  assert.match(source, /TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(source, /EXPECTED_AGENCY_ID = 8/);
  assert.match(source, /Ambassade FRAM/);
});

test("requires the six validated MSE-25.222 predecessor blocks", () => {
  for (const id of [
    "mse25222melunlocalarea",
    "mse25222melunlocalproject",
    "mse25222melundestinationdepartures",
    "mse25222meluninspirationprofiles",
    "mse25222meluncontactchannels",
    "mse25222meluncontactnextstep",
  ]) assert.match(source, new RegExp(id));
});

test("creates six rich text trust and decision blocks on three pages", () => {
  for (const id of [
    "mse25223melunagencyclarity",
    "mse25223melunagencycriteria",
    "mse25223melunreviewreading",
    "mse25223melunreviewdecision",
    "mse25223meluncontactchecklist",
    "mse25223meluncontactdecision",
  ]) assert.match(source, new RegExp(id));
  assert.match(source, /blockType: "rich_text"/);
});

test("content covers agency choice, reviews, reservation checks and quote intent", () => {
  assert.match(source, /Choisir une agence de voyages : quels critères regarder/);
  assert.match(source, /Comment lire les avis sur une agence de voyages à Melun/);
  assert.match(source, /Les points à vérifier avant de retenir une proposition/);
  assert.match(source, /demande-devis\?source=general/);
});

test("mutation is guarded by same-state recheck, snapshot and rollback", () => {
  assert.match(source, /MSE_25_223_CONFIRM/);
  assert.match(source, /MSE_25_223_ROLLBACK/);
  assert.match(source, /guardFingerprint\(justBefore\.site\) !== fingerprint/);
  assert.match(source, /fs\.writeFileSync\(SNAPSHOT_PATH/);
  assert.match(source, /rollback automatique effectué/);
});

test("does not rewrite routes, agency or existing page SEO", () => {
  assert.match(source, /routeWrites: 0/);
  assert.match(source, /agencyWrites: 0/);
  assert.match(source, /pageSeoWrites: 0/);
});
