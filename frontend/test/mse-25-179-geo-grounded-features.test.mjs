import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/FeaturesV2Renderer.js"),
  "utf8",
);

test("MSE-25.179 never injects unpublished service expertise", () => {
  assert.doesNotMatch(source, /businessTravelItem/);
  assert.doesNotMatch(source, /Business Travel/);
  assert.doesNotMatch(source, /voyages-en-groupe/);
  assert.match(source, /serviceItems\(content\.items\)/);
});

test("MSE-25.179 service copy remains factual", () => {
  assert.match(source, /Services publiés/);
  assert.match(source, /services publiés par votre agence de voyages/);
  assert.doesNotMatch(source, /vous conseille selon votre projet/i);
  assert.doesNotMatch(source, /Nous accompagnons également/i);
});

test("MSE-25.179 actions require published href and label", () => {
  assert.match(source, /return href && label \? \{ href, label \} : null/);
  assert.doesNotMatch(source, /Parler de votre projet/);
  assert.doesNotMatch(source, /En savoir plus/);
});

test("MSE-25.179 related navigation is published-only", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /pageHref\(site\.slug, page\)/);
  assert.match(source, /page\.title/);
  assert.doesNotMatch(source, /Destinations conseillées/);
  assert.doesNotMatch(source, /Demander un conseil personnalisé/);
});
