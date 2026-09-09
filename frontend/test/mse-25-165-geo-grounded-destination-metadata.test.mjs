import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = fs.readFileSync(
  path.join(root, "app/agence/[siteSlug]/destination/[destinationSlug]/page.js"),
  "utf8"
);

test("MSE-25.165 destination metadata describes only published destination facts and contact path", () => {
  assert.match(source, /présente les informations publiées sur/);
  assert.match(source, /Contactez l’agence pour poursuivre votre projet/);
});

test("MSE-25.165 destination metadata no longer auto-claims itinerary, personalized quote or generic accompaniment", () => {
  assert.doesNotMatch(source, /conseils, itinéraire et devis personnalisé/i);
  assert.doesNotMatch(source, /vous accompagne pour votre voyage/i);
});

test("MSE-25.165 metadata still uses explicit published destination summary when available", () => {
  assert.match(source, /d\?\.seoDescription \|\| d\?\.summary/);
  assert.match(source, /truncateDescription\(base \? `\$\{local\} \$\{base\}` : local\)/);
});
