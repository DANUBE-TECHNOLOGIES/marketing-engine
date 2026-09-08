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
  assert.match(areaLinks, /dans la préparation de leur projet de voyage/);
  assert.doesNotMatch(areaLinks, /préparer séjours, circuits, croisières, autotours et voyages sur mesure/);
});

test("MSE-25.136 home delegates service detail to the published services page", () => {
  assert.match(areaLinks, /href=\{`\$\{root\}\/services`\}/);
  assert.match(areaLinks, /Services de l’agence de voyages de \{city\}/);
});

test("MSE-25.136 home keeps the canonical visible agency reference block", () => {
  assert.match(areaLinks, /PublicAgencyReferenceFacts/);
  assert.match(areaLinks, /<PublicAgencyReferenceFacts site=\{site\} \/>/);
});
