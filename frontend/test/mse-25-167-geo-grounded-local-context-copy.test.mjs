import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "components/public-site/LocalContentContext.js"),
  "utf8",
);

test("MSE-25.167 local context describes published facts and configured local sectors", () => {
  assert.match(source, /Ce mini-site présente également l’agence pour les secteurs de/);
  assert.match(source, /services actuellement publiés/);
  assert.match(source, /destinations actuellement publiées/);
  assert.match(source, /conseillers présentés par l’agence/);
  assert.match(source, /coordonnées publiques de l’agence/);
});

test("MSE-25.167 local context no longer manufactures operational service promises", () => {
  assert.doesNotMatch(source, /avant, pendant et après/);
  assert.doesNotMatch(source, /vérifie les disponibilités|contrôler les disponibilités/i);
  assert.doesNotMatch(source, /Nous comparons les solutions|nous comparons les destinations/i);
  assert.doesNotMatch(source, /construire une proposition adaptée/i);
  assert.doesNotMatch(source, /rester votre interlocuteur jusqu’à votre retour/i);
});

test("MSE-25.167 internal local links reuse actually published navigation", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /pageSlug\(candidate\) !== currentSlug/);
  assert.match(source, /pageHref\(site\.slug, candidate\)/);
  assert.match(source, /title: candidate\.title/);
  assert.doesNotMatch(source, /`\$\{root\}\/services`/);
  assert.doesNotMatch(source, /`\$\{root\}\/destinations`/);
  assert.doesNotMatch(source, /`\$\{root\}\/inspiration`/);
  assert.doesNotMatch(source, /`\$\{root\}\/contact`/);
});

test("MSE-25.167 does not introduce transactional authority or inferred expertise", () => {
  assert.doesNotMatch(source, /stock|booking|aggregateRating|knowsAbout/i);
});
