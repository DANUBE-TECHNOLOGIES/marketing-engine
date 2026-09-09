import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const team = readFileSync(new URL("../components/public-site/renderers/TeamRenderer.js", import.meta.url), "utf8");
const contact = readFileSync(new URL("../components/public-site/renderers/ContactRenderer.js", import.meta.url), "utf8");

test("MSE-25.153 team default copy stays limited to published member facts", () => {
  assert.match(team, /conseillers présentés par votre agence/);
  assert.match(team, /informations publiées sur leur rôle et leur parcours/);
  assert.doesNotMatch(team, /connaissent vos projets|voyage réellement adapté/i);
});

test("MSE-25.153 contact copy describes public coordinates and configured coverage", () => {
  assert.match(contact, /coordonnées publiques de votre agence/);
  assert.match(contact, /Ce mini-site présente également l’agence pour les secteurs/);
  assert.match(contact, /resolvedTargetCities\(site,\{limit:3\}\)/);
});

test("MSE-25.153 navigation copy only claims published services destinations and inspirations", () => {
  assert.match(contact, /Services publiés par notre agence/);
  assert.match(contact, /Destinations publiées par notre agence/);
  assert.match(contact, /Conseils et inspirations voyage publiés/);
  assert.doesNotMatch(contact, /Destinations conseillées par notre agence/);
  assert.doesNotMatch(contact, /Votre avis aide les voyageurs|Votre avis aide les futurs voyageurs/);
});
