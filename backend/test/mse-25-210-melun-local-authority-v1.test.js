"use strict";

const fs = require("fs");
const path = require("path");
const test = require("node:test");
const assert = require("node:assert/strict");

const scriptPath = path.join(__dirname, "..", "scripts", "mse-25-210-melun-local-authority-v1.js");
const source = fs.readFileSync(scriptPath, "utf8");

test("MSE-25.210 remains strictly scoped to Melun", () => {
  assert.match(source, /const TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(source, /const EXPECTED_AGENCY_ID = 8/);
  assert.match(source, /const EXPECTED_CITY = "Melun"/);
  assert.match(source, /const EXPECTED_LEGAL_PROFILE_ID = "cmtcpy7v30001o2vhakd59ske"/);
  assert.doesNotMatch(source, /mondescale-lamorlaye/);
  assert.doesNotMatch(source, /agencyId:\s*7/);
});

test("MSE-25.210 patches existing pages and blocks only", () => {
  assert.match(source, /engagements:/);
  assert.match(source, /partenaires:/);
  assert.match(source, /inspirations:/);
  assert.match(source, /mse25125bnmelunhome/);
  assert.match(source, /mse25125bnmelunservices/);
  assert.doesNotMatch(source, /agencySitePage\.create/);
  assert.doesNotMatch(source, /pageBlock\.create/);
  assert.doesNotMatch(source, /agencySite\.update/);
  assert.doesNotMatch(source, /legalProfile\.update/);
});

test("MSE-25.210 protects current TUI-era identity", () => {
  assert.match(source, /Ambassade FRAM - Mondescale Maurepas/);
  assert.match(source, /résidu Maurepas\/FRAM encore présent/);
  assert.doesNotMatch(source, /ambassade-fram-mondescale-melun/);
  assert.doesNotMatch(source, /Mondescale Ambassade FRAM/);
});

test("MSE-25.210 has dry-run, snapshot and rollback safeguards", () => {
  assert.match(source, /MSE_25_210_CONFIRM/);
  assert.match(source, /MSE_25_210_ROLLBACK/);
  assert.match(source, /SNAPSHOT_PATH/);
  assert.match(source, /protectedFingerprint/);
  assert.match(source, /topologyFingerprint/);
  assert.match(source, /rollback automatique effectué/);
});

test("MSE-25.210 local copy covers the grounded Melun catchment and priority intents", () => {
  for (const token of [
    "Dammarie-les-Lys",
    "Le Mée-sur-Seine",
    "Vaux-le-Pénil",
    "La Rochette",
    "Rubelles",
    "Vert-Saint-Denis",
    "billetterie aérienne",
    "croisières",
    "voyages sur mesure",
  ]) {
    assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
