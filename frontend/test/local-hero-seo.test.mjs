import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const hero = await readFile(
  new URL("../components/public-site/renderers/HeroV2Renderer.js", import.meta.url),
  "utf8"
);

test("generic home hero headings are localized without overriding editorial titles", () => {
  assert.match(hero, /function genericHeroTitle/);
  assert.match(hero, /Agence de voyages à \$\{city\}/);
  assert.match(hero, /if \(localIntent && genericHeroTitle\(configured, site\)\)/);
});

test("hero intent covers principal local landing pages", () => {
  assert.match(hero, /Services de votre agence de voyages à/);
  assert.match(hero, /Destinations et voyages depuis/);
  assert.match(hero, /Inspirations voyage depuis/);
  assert.match(hero, /Votre équipe de conseillers voyage à/);
  assert.match(hero, /Contacter votre agence de voyages à/);
});
