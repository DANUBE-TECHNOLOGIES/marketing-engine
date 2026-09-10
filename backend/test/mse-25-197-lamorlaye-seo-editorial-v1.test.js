"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sourcePath = path.join(__dirname, "..", "scripts", "mse-25-197-lamorlaye-seo-editorial-v1.js");
const source = fs.readFileSync(sourcePath, "utf8");

function includesAll(values) {
  for (const value of values) assert.ok(source.includes(value), `missing contract token: ${value}`);
}

test("MSE-25.197 targets only the exact Lamorlaye agency site", () => {
  includesAll([
    '"mondescale-lamorlaye"',
    'candidate.slug === TARGET_SITE_SLUG',
    'normalize(site.agency?.city) !== "lamorlaye"',
  ]);
  assert.ok(!source.includes("updateMany({"), "bulk update is forbidden");
  assert.ok(!source.includes("deleteMany({"), "bulk delete is forbidden");
});

test("MSE-25.197 preserves public topology and control agencies", () => {
  includesAll([
    'CONTROL_CITIES = ["Bois-Colombes", "Ozoir-la-Ferrière"]',
    "routeFingerprint(fresh) !== routeFingerprint(site)",
    "destinationFingerprint(fresh) !== destinationFingerprint(site)",
    "controlsBefore[city] !== controlsAfter[city]",
    'destinations: "unchanged"',
    "networkWrites: 0",
  ]);
});

test("MSE-25.197 carries the approved Lamorlaye SEO metadata", () => {
  includesAll([
    "Agence de voyages à Lamorlaye | Mondescale",
    "Agence de voyages à Lamorlaye",
    "Mondescale, agence de voyages à Lamorlaye près de Chantilly et Gouvieux. Séjours, circuits, croisières, voyages sur mesure et billetterie avec les conseils de Stéphanie.",
  ]);
});

test("MSE-25.197 carries the local editorial coverage without inventing an airport in Lamorlaye", () => {
  includesAll([
    "Gouvieux",
    "Chantilly",
    "Coye-la-Forêt",
    "Orry-la-Ville",
    "Paris-Charles-de-Gaulle (CDG)",
    "Paris-Orly (ORY)",
    "conditions tarifaires",
    "bagages",
    "correspondances",
    "Billets d'avion et de train à Lamorlaye",
  ]);
  assert.ok(!/a[eé]roport\s+(?:de|à)\s+Lamorlaye/i.test(source));
});

test("MSE-25.197 enriches the existing Stéphanie entity and requires its existing photo", () => {
  includesAll([
    "findStephanie(site)",
    "stephanie.photo",
    "photo existante de Stéphanie introuvable; refus de créer un nouveau média",
    "Stéphanie — Conseillère voyage à Lamorlaye",
    'role: "Conseillère voyage"',
  ]);
});

test("MSE-25.197 keeps partner and review provenance authoritative", () => {
  includesAll([
    'blockType: "partners"',
    "marques et partenaires actuellement référencés par Mondescale",
    'blockType: "reviews"',
    "Google Business Profile synchronized renderer only",
  ]);
  assert.ok(!source.includes("FRAM, TUI"), "partner brands must not be hardcoded as editorial data");
});

test("MSE-25.197 contains the requested service families", () => {
  includesAll([
    "Séjours & clubs",
    "Circuits accompagnés",
    "Voyages sur mesure",
    "Autotours",
    "Croisières",
    "Voyages en famille",
    "Voyages de noces & grands voyages",
    "Voyages en groupe",
    "Billets d’avion",
    "Billets de train",
  ]);
});

test("MSE-25.197 is dry-run by default and has guarded apply/rollback", () => {
  includesAll([
    "MSE_25_197_CONFIRM",
    "MSE_25_197_ROLLBACK",
    'mode: APPLY ? "APPLY" : "DRY_RUN"',
    'flag: "wx"',
  ]);
});
