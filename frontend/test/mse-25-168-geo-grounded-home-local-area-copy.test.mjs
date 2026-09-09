import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "components/public-site/LocalSeoAreaLinks.js"),
  "utf8",
);

test("MSE-25.168 home local area describes implantation and explicitly published sectors", () => {
  assert.match(source, /Zone locale publiée/);
  assert.match(source, /L’agence est implantée à \{city\}/);
  assert.match(source, /Ce mini-site présente également l’agence pour les secteurs de/);
  assert.match(source, /Les autres secteurs de proximité publiés sur ce mini-site/);
});

test("MSE-25.168 extended catchment remains contextual rather than canonical service authority", () => {
  assert.match(source, /Une zone locale élargie est également présentée/);
  assert.match(source, /sans modifier l’adresse d’implantation de l’agence/);
  assert.doesNotMatch(source, /accompagne également des projets|bassin de clientèle/i);
});

test("MSE-25.168 home local links use grounded published wording", () => {
  assert.match(source, /Services publiés par l’agence de \{city\}/);
  assert.match(source, /Destinations publiées depuis \{city\}/);
  assert.match(source, /Conseils et inspirations publiés depuis \{city\}/);
  assert.match(source, /Coordonnées de l’agence de \{city\}/);
  assert.doesNotMatch(source, /Destinations conseillées depuis/);
});

test("MSE-25.168 home local copy does not manufacture lifecycle or transactional promises", () => {
  assert.doesNotMatch(source, /jusqu’au retour|premières recherches|vérifie les disponibilités|contrôler les disponibilités/i);
  assert.doesNotMatch(source, /price|stock|booking|aggregateRating|knowsAbout/i);
});
