import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const inspirationIndex = await readFile(
  new URL("../app/agence/[siteSlug]/inspiration/page.js", import.meta.url),
  "utf8"
);
const destinationPage = await readFile(
  new URL("../components/destination/DestinationPage.js", import.meta.url),
  "utf8"
);

test("inspiration cards use descriptive internal link anchors", () => {
  assert.match(inspirationIndex, /Découvrir \{title\}/);
  assert.doesNotMatch(inspirationIndex, />\s*Lire l’inspiration\s*</);
});

test("inspiration hub links back to agency home and contact", () => {
  assert.match(inspirationIndex, /Découvrir votre agence \{site\.name\}/);
  assert.match(inspirationIndex, /Parler de votre projet de voyage/);
});

test("destination pages connect to agency, inspiration hub and contact", () => {
  assert.match(destinationPage, /Accueil de \{site\.name\}/);
  assert.match(destinationPage, /Voir les conseils et inspirations voyage/);
  assert.match(destinationPage, /Contacter \{site\.name\}/);
});
