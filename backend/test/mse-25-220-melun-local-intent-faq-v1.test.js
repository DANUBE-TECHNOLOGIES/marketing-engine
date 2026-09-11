"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync(
  new URL("../scripts/mse-25-220-melun-local-intent-faq-v1.js", import.meta?.url || `file://${__filename}`),
  "utf8"
);

test("targets Melun agency 8 and preserves current brand", () => {
  assert.match(source, /TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(source, /EXPECTED_AGENCY_ID = 8/);
  assert.match(source, /Ambassade FRAM/);
});

test("requires the validated MSE-25.219 conversion predecessor", () => {
  for (const id of [
    "mse25219melunagencyappointment",
    "mse25219melunservicesappointment",
    "mse25219melundestinationsappointment",
    "mse25219melunreviewsappointment",
    "mse25219meluncontactcta",
  ]) assert.match(source, new RegExp(id));
});

test("creates four FAQ blocks with three grounded answers each", () => {
  for (const id of [
    "mse25220melunagencyfaq",
    "mse25220melunservicesfaq",
    "mse25220melundestinationsfaq",
    "mse25220meluncontactfaq",
  ]) assert.match(source, new RegExp(id));
  assert.match(source, /blockType: "faq"/);
  assert.match(source, /faqItems:/);
});

test("FAQ content covers local agency, services, destination choice and contact intent", () => {
  assert.match(source, /10 Rue Saint Etienne à Melun/);
  assert.match(source, /billetterie aérienne/);
  assert.match(source, /Comment choisir une destination/);
  assert.match(source, /01 64 39 31 07/);
});

test("mutation is guarded by same-state recheck, snapshot and rollback", () => {
  assert.match(source, /MSE_25_220_CONFIRM/);
  assert.match(source, /MSE_25_220_ROLLBACK/);
  assert.match(source, /guardFingerprint\(justBefore\.site\) !== fingerprint/);
  assert.match(source, /fs\.writeFileSync\(SNAPSHOT_PATH/);
  assert.match(source, /rollback automatique effectué/);
});

test("does not rewrite routes, agency or existing page SEO", () => {
  assert.match(source, /routeWrites: 0/);
  assert.match(source, /agencyWrites: 0/);
  assert.match(source, /pageSeoWrites: 0/);
});
