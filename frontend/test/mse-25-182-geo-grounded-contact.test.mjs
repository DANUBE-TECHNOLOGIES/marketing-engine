import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const renderer = fs.readFileSync(
  path.join(root, "components/public-site/renderers/ContactRenderer.js"),
  "utf8"
);

test("contact related links come only from published navigation", () => {
  assert.match(renderer, /uniquePublishedNavigation\(site\)/);
  assert.match(renderer, /RELATED_CONTACT_PAGE_SLUGS\.has\(pageSlug\(page\)\)/);
  assert.match(renderer, /pageHref\(site\.slug, page\)/);
  assert.doesNotMatch(renderer, /siteHref\(site,/);
});

test("contact does not publish invented missing-data states", () => {
  assert.doesNotMatch(renderer, /Adresse en cours de mise à jour/);
  assert.doesNotMatch(renderer, /Numéro en cours de mise à jour/);
});

test("Google review action requires a configured review URL", () => {
  assert.match(renderer, /if \(!reviewUrl\) return null/);
  assert.match(renderer, /href=\{reviewUrl\}/);
});

test("default contact introduction stays factual", () => {
  assert.match(renderer, /Retrouvez les coordonnées publiques de votre agence/);
  assert.doesNotMatch(renderer, /préparer votre prochain voyage/);
});
