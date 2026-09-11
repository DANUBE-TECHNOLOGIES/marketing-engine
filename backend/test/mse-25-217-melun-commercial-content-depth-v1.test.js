"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(
  path.resolve(__dirname, "../scripts/mse-25-217-melun-commercial-content-depth-v1.js"),
  "utf8"
);

test("targets Melun agency 8 only and protects current public identity", () => {
  assert.match(source, /TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(source, /EXPECTED_AGENCY_ID = 8/);
  assert.match(source, /EXPECTED_CITY = "Melun"/);
  assert.match(source, /EXPECTED_POSTAL_CODE = "77000"/);
  assert.match(source, /Ambassade FRAM/);
  assert.match(source, /ambassade-fram-mondescale-melun/);
});

test("adds one deterministic rich text authority block to five existing pages", () => {
  for (const token of [
    "mse25217melunagency",
    "mse25217melundestinations",
    "mse25217meluninspirations",
    "mse25217melunreviews",
    "mse25217meluncontact",
  ]) assert.match(source, new RegExp(token));

  for (const slug of ["agence", "destinations", "inspirations", "avis", "contact"]) {
    assert.match(source, new RegExp(`${slug}: \\{`));
  }

  assert.match(source, /blockType: "rich_text"/);
  assert.match(source, /status: "published"/);
  assert.match(source, /visibleDesktop: true/);
  assert.match(source, /visibleMobile: true/);
});

test("commercial depth keeps canonical internal journeys and useful project qualifiers", () => {
  for (const route of ["services", "destinations", "inspiration", "avis", "contact"]) {
    assert.match(source, new RegExp(`/agence/tui-store-melun/${route}`));
  }

  for (const term of [
    "billets d’avion",
    "circuit",
    "croisière",
    "autotour",
    "voyage sur mesure",
    "budget",
    "vol direct",
  ]) assert.match(source, new RegExp(term));
});

test("local authority is natural and grounded around the Melun catchment", () => {
  for (const city of [
    "Dammarie-les-Lys",
    "Le Mée-sur-Seine",
    "Vaux-le-Pénil",
    "La Rochette",
    "Rubelles",
    "Vert-Saint-Denis",
  ]) assert.match(source, new RegExp(city));

  assert.match(source, /10 Rue Saint Etienne/);
});

test("mutation is guarded by exact pre-apply topology, dry-run, snapshot and rollback", () => {
  assert.match(source, /EXPECTED_TOPOLOGY_FINGERPRINT = "06072a84a232869e738107683549a3c5978418ebadcbc4aa8b7529c0dec9e100"/);
  assert.match(source, /MSE_25_217_CONFIRM/);
  assert.match(source, /MSE_25_217_ROLLBACK/);
  assert.match(source, /MSE_25_217_SNAPSHOT/);
  assert.match(source, /mutationPerformed: false/);
  assert.match(source, /createdBlockIds/);
  assert.match(source, /pageBlock\.deleteMany/);
  assert.match(source, /rollback automatique effectué/);
});

test("does not mutate agency, routes or existing page SEO fields", () => {
  assert.match(source, /routeWrites: 0/);
  assert.match(source, /agencyWrites: 0/);
  assert.doesNotMatch(source, /tx\.agency\.update/);
  assert.doesNotMatch(source, /agencySitePage\.update/);
});
