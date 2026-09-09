import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const areaLinks = fs.readFileSync(
  path.join(root, "components/public-site/LocalSeoAreaLinks.js"),
  "utf8"
);

test("MSE-25.136 home local copy stays factual instead of enumerating unverified services", () => {
  assert.match(areaLinks, /Ce mini-site présente également l’agence pour les secteurs de/);
  assert.match(areaLinks, /L’agence est implantée à \{city\}/);
  assert.doesNotMatch(areaLinks, /préparer séjours, circuits, croisières, autotours et voyages sur mesure/);
  assert.doesNotMatch(areaLinks, /suit\s+votre projet|jusqu’au retour|accompagne aussi les voyageurs/i);
});

test("MSE-25.136 home delegates navigation only to actually published pages", () => {
  assert.match(areaLinks, /uniquePublishedNavigation\(site\)/);
  assert.match(areaLinks, /pageHref\(site\.slug, page\)/);
  assert.match(areaLinks, /title: page\.title/);
  assert.match(areaLinks, /relatedPages\.map\(\(page\) =>/);
  assert.doesNotMatch(areaLinks, /`\$\{root\}\/services`/);
  assert.doesNotMatch(areaLinks, /`\$\{root\}\/destinations`/);
  assert.doesNotMatch(areaLinks, /`\$\{root\}\/inspiration`/);
  assert.doesNotMatch(areaLinks, /`\$\{root\}\/contact`/);
});

test("MSE-25.136 home keeps the canonical visible agency reference block", () => {
  assert.match(areaLinks, /PublicAgencyReferenceFacts/);
  assert.match(areaLinks, /<PublicAgencyReferenceFacts site=\{site\} \/>/);
});
