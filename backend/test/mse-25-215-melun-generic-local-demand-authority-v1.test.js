"use strict";

const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");

const scriptPath = path.join(
  __dirname,
  "..",
  "scripts",
  "mse-25-215-melun-generic-local-demand-authority-v1.js"
);
const source = fs.readFileSync(scriptPath, "utf8");

function between(start, end) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  assert.notEqual(a, -1, `start marker absent: ${start}`);
  assert.notEqual(b, -1, `end marker absent: ${end}`);
  return source.slice(a, b);
}

test("MSE-25.215 reste strictement ciblé sur Melun agencyId 8", () => {
  assert.match(source, /TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(source, /EXPECTED_AGENCY_ID = 8/);
  assert.match(source, /EXPECTED_CITY = "Melun"/);
  assert.match(source, /EXPECTED_POSTAL_CODE = "77000"/);
  assert.match(source, /EXPECTED_ADDRESS = "10 Rue Saint Etienne"/);
  assert.doesNotMatch(source, /mondescale-lamorlaye/);
  assert.doesNotMatch(source, /agencyId:\s*7/);
});

test("MSE-25.215 renforce un lot éditorial conséquent sans créer de page", () => {
  const pages = between("const PAGE_PATCHES", "const BLOCK_PATCHES");
  for (const token of [
    '"":',
    "services:",
    "destinations:",
    "inspirations:",
    "avis:",
    "contact:",
  ]) {
    assert.match(pages, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(source, /mse25125bnmelunhome/);
  assert.match(source, /mse25125bnmelunservices/);
  assert.doesNotMatch(source, /agencySitePage\.create/);
  assert.doesNotMatch(source, /pageBlock\.create/);
  assert.doesNotMatch(source, /updateMany/);
  assert.doesNotMatch(source, /deleteMany/);
});

test("MSE-25.215 cible les requêtes génériques prioritaires", () => {
  const proposed = between("const PAGE_PATCHES", "function clone");
  for (const token of [
    "Agence de voyages",
    "Billetterie",
    "billets d’avion",
    "séjours",
    "circuits",
    "croisières",
    "autotours",
    "voyages sur mesure",
    "devis",
    "rendez-vous",
  ]) {
    assert.match(proposed, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("MSE-25.215 couvre naturellement le bassin melunais", () => {
  for (const city of [
    "Dammarie-les-Lys",
    "Le Mée-sur-Seine",
    "Vaux-le-Pénil",
    "La Rochette",
    "Rubelles",
    "Vert-Saint-Denis",
  ]) {
    assert.match(source, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("MSE-25.215 ajoute un maillage interne canonique Melun", () => {
  const blocks = between("const BLOCK_PATCHES", "function clone");
  for (const href of [
    "/agence/tui-store-melun/services",
    "/agence/tui-store-melun/destinations",
    "/agence/tui-store-melun/inspiration",
    "/agence/tui-store-melun/avis",
    "/agence/tui-store-melun/contact",
  ]) {
    assert.match(blocks, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(blocks, /href="\/contact"/);
});

test("MSE-25.215 n’anticipe pas le branding du 1er octobre", () => {
  const proposed = between("const PAGE_PATCHES", "function clone");
  assert.doesNotMatch(proposed, /Ambassade FRAM/);
  assert.doesNotMatch(proposed, /Mondescale Ambassade FRAM/);
  assert.doesNotMatch(proposed, /ambassade-fram-mondescale-melun/);
  assert.match(source, /FORBIDDEN_PUBLIC_BRANDS/);
});

test("MSE-25.215 reste dry-run par défaut avec snapshot et rollback", () => {
  assert.match(source, /MSE_25_215_CONFIRM/);
  assert.match(source, /MSE_25_215_ROLLBACK/);
  assert.match(source, /MSE_25_215_SNAPSHOT/);
  assert.match(source, /mode: "DRY_RUN"/);
  assert.match(source, /mode: "ROLLBACK"/);
  assert.match(source, /mode: "APPLY"/);
  assert.match(source, /rollback automatique effectué/);
});

test("MSE-25.215 protège topologie, agence et champs non ciblés", () => {
  assert.match(source, /topologyFingerprint/);
  assert.match(source, /protectedFingerprint/);
  assert.match(source, /routeWrites: 0/);
  assert.match(source, /agencyWrites: 0/);
  assert.doesNotMatch(source, /tx\.agency\.update/);
  assert.doesNotMatch(source, /tx\.agencySite\.update/);
});
