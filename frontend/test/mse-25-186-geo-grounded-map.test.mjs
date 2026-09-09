import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const renderer = readFileSync(new URL("../components/public-site/renderers/MapRenderer.js", import.meta.url), "utf8");

test("MSE-25.186 map navigation is published-only", () => {
  assert.match(renderer, /uniquePublishedNavigation\(site\)/);
  assert.match(renderer, /pageSlug\(page\)/);
  assert.match(renderer, /pageHref\(site\.slug, page\)/);
  assert.doesNotMatch(renderer, /\/contact`|\/equipe`|\/services`/);
});

test("MSE-25.186 map requires a published location fact", () => {
  assert.match(renderer, /hasLocationFact/);
  assert.match(renderer, /if \(!queryParts\.length\) return null/);
});

test("MSE-25.186 map fallback copy stays factual", () => {
  assert.match(renderer, /Localisation de notre agence/);
  assert.match(renderer, /localisation publiée/);
  assert.doesNotMatch(renderer, /venez échanger directement|prochain voyage|Rencontrer notre équipe|Découvrir nos services voyage/);
});
