"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../scripts/mse-25-199-lamorlaye-editorial-deduplication.js"), "utf8");

test("MSE-25.199 targets exact visible Lamorlaye legacy titles only", () => {
  assert.match(source, /mondescale-lamorlaye/);
  for (const title of [
    "Pourquoi choisir notre agence ?",
    "Nos services",
    "Billetterie et vols à Lamorlaye",
    "Un accompagnement organisé depuis Lamorlaye",
    "Billetterie aérienne et vols à Lamorlaye",
    "Séjours et vacances avec votre agence à Lamorlaye",
  ]) assert.ok(source.includes(title));
  assert.match(source, /KEEP_TITLES/);
});

test("MSE-25.199 preserves the useful new blocks and CTA/FAQ", () => {
  for (const title of [
    "Quel voyage préparez-vous ?",
    "Billets d'avion et de train à Lamorlaye",
    "Parlons de votre prochain voyage",
    "Questions fréquentes sur nos services",
  ]) assert.ok(source.includes(title));
});

test("MSE-25.199 disables rather than deletes and protects all untargeted content", () => {
  assert.match(source, /status: "draft"/);
  assert.match(source, /visibleDesktop: false/);
  assert.match(source, /visibleMobile: false/);
  assert.doesNotMatch(source, /pageBlock\.delete/);
  assert.match(source, /routeFingerprintUnchanged: true/);
  assert.match(source, /protectedContentUnchanged: true/);
  assert.match(source, /routeWrites: 0/);
  assert.match(source, /networkWrites: 0/);
});

test("MSE-25.199 is dry-run first with snapshot and rollback", () => {
  assert.match(source, /MSE_25_199_CONFIRM/);
  assert.match(source, /MSE_25_199_ROLLBACK/);
  assert.match(source, /mode: "DRY_RUN"/);
  assert.match(source, /fs\.writeFileSync\(SNAPSHOT_PATH/);
  assert.match(source, /await rollback\(site\)/);
});
