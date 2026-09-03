import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const hero = await readFile(
  new URL("../components/public-site/renderers/HeroV2Renderer.js", import.meta.url),
  "utf8"
);
const agency = await readFile(
  new URL("../components/public-site/renderers/AgencyV2Renderer.js", import.meta.url),
  "utf8"
);

test("hero fallback carries genuine local search intent", () => {
  assert.match(hero, /Votre agence de voyages à \$\{city\}/);
  assert.match(hero, /Agence de voyages · \$\{city\}/);
  assert.match(hero, /content\.title \|\|/);
});

test("agency section fallback names the actual agency city", () => {
  assert.match(agency, /Votre agence de voyages à \$\{city\}/);
  assert.match(agency, /getSectionTitle/);
});

test("visible agency address is semantically marked up", () => {
  assert.match(agency, /<address>/);
  assert.match(agency, /agency\.postalCode/);
  assert.match(agency, /agency\.city/);
});
