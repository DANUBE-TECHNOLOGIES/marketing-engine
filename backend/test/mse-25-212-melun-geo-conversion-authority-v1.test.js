"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const scriptPath = path.resolve(__dirname, "../scripts/mse-25-212-melun-geo-conversion-authority-v1.js");
const script = fs.readFileSync(scriptPath, "utf8");
const localArea = fs.readFileSync(
  path.resolve(__dirname, "../../frontend/lib/seo/local-area-config.js"),
  "utf8"
);
const jsonLd = fs.readFileSync(
  path.resolve(__dirname, "../../frontend/lib/seo/json-ld.js"),
  "utf8"
);
const prismaSchema = fs.readFileSync(
  path.resolve(__dirname, "../prisma/schema.prisma"),
  "utf8"
);

function between(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `start marker absent: ${start}`);
  assert.notEqual(endIndex, -1, `end marker absent: ${end}`);
  return source.slice(startIndex, endIndex);
}

test("MSE-25.212 reste strictement ciblé sur Melun agencyId 8", () => {
  assert.match(script, /TARGET_SITE_SLUG = "tui-store-melun"/);
  assert.match(script, /EXPECTED_AGENCY_ID = 8/);
  assert.match(script, /EXPECTED_CITY = "Melun"/);
  assert.match(script, /EXPECTED_ADDRESS = "10 Rue Saint Etienne"/);
  assert.match(script, /EXPECTED_POSTAL_CODE = "77000"/);
  assert.match(script, /EXPECTED_LEGAL_PROFILE_ID = "cmtcpy7v30001o2vhakd59ske"/);
  assert.doesNotMatch(script, /mondescale-lamorlaye/);
});

test("les FAQ couvrent Home, Services et Contact sans branding FRAM anticipé", () => {
  const faqPatchSource = between(script, "const FAQ_PATCHES", "function clone");
  assert.match(faqPatchSource, /home:/);
  assert.match(faqPatchSource, /services:/);
  assert.match(faqPatchSource, /contact:/);
  assert.match(faqPatchSource, /billets d’avion/);
  assert.match(faqPatchSource, /voyages sur mesure/);
  assert.match(faqPatchSource, /croisière/);
  assert.match(faqPatchSource, /voyage en groupe/);
  assert.match(faqPatchSource, /paiement en plusieurs fois/);
  assert.match(faqPatchSource, /01 64 39 31 07/);
  assert.match(faqPatchSource, /agencemelun@tuifrance\.com/);
  assert.doesNotMatch(faqPatchSource, /Ambassade FRAM/);
  assert.doesNotMatch(faqPatchSource, /Mondescale Ambassade FRAM/);
});

test("la clé logique home cible le slug canonique vide de la page d'accueil", () => {
  const mappingSource = between(script, "const PAGE_DB_SLUGS", "const FAQ_PATCHES");
  assert.match(mappingSource, /home:\s*""/);
  assert.match(mappingSource, /services:\s*"services"/);
  assert.match(mappingSource, /contact:\s*"contact"/);
  assert.match(script, /function pageForPatch\(site, patchSlug\)/);
  assert.match(script, /const page = pageForPatch\(site, patchSlug\)/);
  assert.match(script, /const page = pageForPatch\(state\.site, patchSlug\)/);
  assert.match(script, /dbPageSlug: PAGE_DB_SLUGS\[patchSlug\]/);
});

test("la zone locale Melun est identique au contrat SEO public existant", () => {
  for (const city of [
    "Dammarie-les-Lys",
    "Le Mée-sur-Seine",
    "Vaux-le-Pénil",
    "La Rochette",
    "Rubelles",
    "Vert-Saint-Denis",
  ]) {
    assert.match(script, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(localArea, new RegExp(city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("la référence géographique est sourcée mais non mutée sans modèle persistant dédié", () => {
  assert.match(script, /latitude: 48\.53612/);
  assert.match(script, /longitude: 2\.65823/);
  assert.match(script, /OpenStreetMap node 13202447292/);
  assert.match(script, /mutation: false/);

  const agencyModel = between(prismaSchema, "model Agency {", "model Notification {");
  const agencySiteModel = between(prismaSchema, "model AgencySite {", "model AgencySitePage {");
  assert.doesNotMatch(agencyModel, /^\s*latitude\s+/m);
  assert.doesNotMatch(agencyModel, /^\s*longitude\s+/m);
  assert.doesNotMatch(agencySiteModel, /^\s*latitude\s+/m);
  assert.doesNotMatch(agencySiteModel, /^\s*longitude\s+/m);

  assert.match(jsonLd, /latitude = agency\?\.latitude \?\? site\?\.latitude/);
  assert.match(jsonLd, /longitude = agency\?\.longitude \?\? site\?\.longitude/);
  assert.match(jsonLd, /"@type": "GeoCoordinates"/);
});

test("la mutation ne touche que le contenu/version des blocs FAQ existants", () => {
  assert.match(script, /tx\.pageBlock\.update/);
  assert.doesNotMatch(script, /tx\.agency\.update/);
  assert.doesNotMatch(script, /tx\.agencySite\.update/);
  assert.doesNotMatch(script, /tx\.agencySitePage\.update/);
  assert.doesNotMatch(script, /\.create\(/);
  assert.doesNotMatch(script, /\.delete\(/);
  assert.match(script, /topologyFingerprint\(after\.site\) !== beforeTopology/);
  assert.match(script, /protectedFingerprint\(after\) !== beforeProtected/);
  assert.match(script, /rollback automatique effectué/);
});
