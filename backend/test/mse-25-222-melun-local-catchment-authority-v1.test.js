"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.join(__dirname, "../scripts/mse-25-222-melun-local-catchment-authority-v1.js"),
  "utf8"
);

test("targets Melun agency 8 and preserves current brand", () => {
  assert.match(source, /TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(source, /EXPECTED_AGENCY_ID = 8/);
  assert.match(source, /Ambassade FRAM/);
});

test("requires the validated MSE-25.221 service predecessor", () => {
  for (const id of [
    "mse25221melunserviceair",
    "mse25221melunserviceformats",
    "mse25221melunserviceprofiles",
    "mse25221melunservicecompare",
  ]) assert.match(source, new RegExp(id));
});

test("creates six rich-text blocks across four pages", () => {
  for (const id of [
    "mse25222melunlocalarea",
    "mse25222melunlocalproject",
    "mse25222melundestinationdepartures",
    "mse25222meluninspirationprofiles",
    "mse25222meluncontactchannels",
    "mse25222meluncontactnextstep",
  ]) assert.match(source, new RegExp(id));
  assert.match(source, /blockCreates: plan.length/);
  assert.match(source, /targetPages:/);
  assert.match(source, /blockType: "rich_text"/);
});

test("grounds local catchment without inventing satellite agencies", () => {
  for (const place of [
    "Dammarie-les-Lys",
    "Le Mée-sur-Seine",
    "Vaux-le-Pénil",
    "La Rochette",
    "Rubelles",
    "Livry-sur-Seine",
    "Vert-Saint-Denis",
  ]) assert.match(source, new RegExp(place));
  assert.match(source, /Ces communes ne correspondent pas à des agences distinctes/);
});

test("uses existing internal journeys and real Melun contact number", () => {
  assert.match(source, /\/agence\/tui-store-melun\/services/);
  assert.match(source, /\/agence\/tui-store-melun\/destinations/);
  assert.match(source, /\/agence\/tui-store-melun\/contact/);
  assert.match(source, /01 64 39 31 07/);
});

test("mutation is guarded by same-state recheck, snapshot and rollback", () => {
  assert.match(source, /MSE_25_222_CONFIRM/);
  assert.match(source, /MSE_25_222_ROLLBACK/);
  assert.match(source, /guardFingerprint\(justBefore\.site\) !== fingerprint/);
  assert.match(source, /fs\.writeFileSync\(SNAPSHOT_PATH/);
  assert.match(source, /rollback automatique effectué/);
});

test("does not rewrite routes, agency or page SEO", () => {
  assert.match(source, /routeWrites: 0/);
  assert.match(source, /agencyWrites: 0/);
  assert.match(source, /pageSeoWrites: 0/);
});
