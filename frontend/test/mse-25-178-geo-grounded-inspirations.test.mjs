import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/InspirationsRenderer.js"),
  "utf8",
);

test("MSE-25.178 inspirations copy stays factual", () => {
  assert.match(source, /Inspirations publiées/);
  assert.match(source, /contenus d’inspiration publiés/);
  assert.doesNotMatch(source, /conseils, idées de destinations et sélections/i);
  assert.doesNotMatch(source, /accompagnés par notre équipe/i);
  assert.doesNotMatch(source, /Destinations conseillées/i);
  assert.doesNotMatch(source, /Demander un conseil personnalisé/i);
});

test("MSE-25.178 related navigation only uses published pages", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /RELATED_INSPIRATION_PAGE_SLUGS/);
  assert.match(source, /pageHref\(site\.slug, page\)/);
  assert.match(source, /page\.title/);
  assert.doesNotMatch(source, /`\$\{root\}\/destinations`/);
  assert.doesNotMatch(source, /`\$\{root\}\/services`/);
  assert.doesNotMatch(source, /`\$\{root\}\/contact`/);
});

test("MSE-25.178 inspiration cards preserve published item content", () => {
  assert.match(source, /item\.category/);
  assert.match(source, /item\.description/);
  assert.match(source, /item\?\.slug/);
  assert.doesNotMatch(source, /conseil de notre agence/i);
});
