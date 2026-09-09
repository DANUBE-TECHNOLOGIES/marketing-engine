import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(
  new URL("../components/public-site/renderers/DestinationsRenderer.js", import.meta.url),
  "utf8"
);

test("MSE-25.188 grounds destination copy and navigation on published data", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /RELATED_DESTINATION_PAGE_SLUGS\.has\(pageSlug\(page\)\)/);
  assert.match(source, /pageHref\(site\.slug, page\)/);
  assert.match(source, /title: page\.title/);
  assert.match(source, /aria-label={`Voir \$\{title\}`}/);

  assert.doesNotMatch(source, /resolvedTargetCities/);
  assert.doesNotMatch(source, /destinationSiteRoot/);
  assert.doesNotMatch(source, /préparez votre prochain départ/i);
  assert.doesNotMatch(source, /conseils de votre agence/i);
  assert.doesNotMatch(source, /Nous accompagnons aussi les voyageurs/i);
  assert.doesNotMatch(source, /\$\{root\}\/inspiration/);
  assert.doesNotMatch(source, /\$\{root\}\/services/);
  assert.doesNotMatch(source, /\$\{root\}\/contact/);
  assert.doesNotMatch(source, /Demander conseil/i);
});

test("MSE-25.188 uses neutral fallbacks and filters unusable destination cards", () => {
  assert.match(source, /return "Destinations publiées"/);
  assert.match(source, /public-site-section-kicker">Destinations/);
  assert.match(source, /String\(item\?\.title \|\| item\?\.name \|\| ""\)\.trim\(\)/);
  assert.match(source, /if \(!title\) return null/);
  assert.match(source, /const introduction = String\(content\.text \|\| content\.description \|\| ""\)\.trim\(\)/);
  assert.doesNotMatch(source, /Nos destinations du moment/);
  assert.doesNotMatch(source, /Idées de voyages depuis/);
});
