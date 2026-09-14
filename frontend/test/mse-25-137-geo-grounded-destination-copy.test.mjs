import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../lib/seo/destination-local-differentiation.js", import.meta.url),
  "utf8"
);

test("destination local GEO copy does not manufacture agency expertise or transactional facts", () => {
  assert.doesNotMatch(source, /Cette expertise est accessible/);
  assert.doesNotMatch(source, /ajuster les étapes/);
  assert.doesNotMatch(source, /vérifier la cohérence globale du voyage avant réservation/);
  assert.doesNotMatch(source, /transport, durée, rythme, hébergements et options utiles/);
  assert.doesNotMatch(source, /arbitrer entre budget, confort, emplacement et expériences/);
});

test("destination local GEO copy explicitly anchors destination claims to published page content", () => {
  assert.match(source, /informations publiées/);
  assert.match(source, /contenu publié/);
  assert.match(source, /point de départ à votre projet/);
  assert.match(source, /contacter l’agence/);
});
