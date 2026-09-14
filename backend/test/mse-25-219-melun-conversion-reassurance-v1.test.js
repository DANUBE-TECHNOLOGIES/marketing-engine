"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const script = fs.readFileSync(
  path.join(__dirname, "../scripts/mse-25-219-melun-conversion-reassurance-v1.js"),
  "utf8"
);

test("targets Melun agency 8 only and preserves current public brand", () => {
  assert.match(script, /TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(script, /EXPECTED_AGENCY_ID = 8/);
  assert.match(script, /EXPECTED_CITY = "Melun"/);
  assert.match(script, /EXPECTED_POSTAL_CODE = "77000"/);
  assert.match(script, /Ambassade FRAM/);
  assert.match(script, /ambassade-fram-mondescale-melun/);
});

test("requires the validated MSE-25.217 predecessor blocks", () => {
  for (const id of [
    "mse25217melunagency",
    "mse25217melundestinations",
    "mse25217meluninspirations",
    "mse25217melunreviews",
    "mse25217meluncontact",
  ]) {
    assert.match(script, new RegExp(id));
  }
  assert.match(script, /prédécesseur #217 absent/);
});

test("creates four appointment journeys and one contact conversion CTA", () => {
  for (const id of [
    "mse25219melunagencyappointment",
    "mse25219melunservicesappointment",
    "mse25219melundestinationsappointment",
    "mse25219melunreviewsappointment",
    "mse25219meluncontactcta",
  ]) {
    assert.match(script, new RegExp(id));
  }
  assert.equal((script.match(/blockType: "appointment"/g) || []).length, 4);
  assert.equal((script.match(/blockType: "cta"/g) || []).length, 1);
});

test("contact conversion offers a grounded quote route and direct agency call", () => {
  assert.match(script, /Demander un devis/);
  assert.match(script, /Appeler l’agence/);
  assert.match(script, /tel:\+33164393107/);
  assert.match(script, /01 64 39 31 07/);
});

test("does not rewrite routes, agency or existing page SEO", () => {
  assert.match(script, /routeWrites: 0/);
  assert.match(script, /agencyWrites: 0/);
  assert.match(script, /pageSeoWrites: 0/);
  assert.doesNotMatch(script, /tx\.agency\.update/);
  assert.doesNotMatch(script, /tx\.agencySite\.update/);
  assert.doesNotMatch(script, /tx\.page\.update/);
});

test("mutation is guarded by dry-run, same-state recheck, snapshot and rollback", () => {
  assert.match(script, /MSE_25_219_CONFIRM/);
  assert.match(script, /MSE_25_219_ROLLBACK/);
  assert.match(script, /MSE_25_219_SNAPSHOT/);
  assert.match(script, /guardFingerprint/);
  assert.match(script, /modifié entre précontrôle et APPLY/);
  assert.match(script, /fs\.writeFileSync/);
  assert.match(script, /deleteMany/);
  assert.match(script, /rollback automatique effectué/);
  assert.match(script, /mutationPerformed: false/);
});
