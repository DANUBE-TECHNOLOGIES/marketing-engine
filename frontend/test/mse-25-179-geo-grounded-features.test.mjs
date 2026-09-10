import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const source = fs.readFileSync(
  path.join(process.cwd(), "components/public-site/renderers/FeaturesV2Renderer.js"),
  "utf8",
);

test("MSE-25.179 keeps published service content and restores the managed Business Travel card", () => {
  assert.match(source, /serviceItems\(content\.items\)/);
  assert.match(source, /item\.text/);
  assert.match(source, /item\.description/);
  assert.match(source, /function managedBusinessTravelItem\(\)/);
  assert.match(source, /title: "Voyages d’affaires"/);
  assert.match(source, /id: "business-travel"/);
  assert.match(source, /items\.some\(isBusinessTravelItem\)/);
  assert.match(source, /return \[\.\.\.items, managedBusinessTravelItem\(\)\]/);
  assert.doesNotMatch(source, /vous conseille selon votre projet/i);
  assert.doesNotMatch(source, /Nous accompagnons également/i);
});

test("MSE-25.179 allows only explicit actions or approved managed commercial routes", () => {
  assert.match(source, /function managedFeatureAction\(root, item\)/);
  assert.match(source, /MANAGED_FEATURE_ACTIONS/);
  assert.match(source, /slug: "business-travel"/);
  assert.match(source, /slug: "voyages-en-groupe"/);
  assert.match(source, /if \(href && label\) return \{ href, label \}/);
  assert.match(source, /return managedFeatureAction\(root, item\)/);
  assert.doesNotMatch(source, /Parler de votre projet/);
  assert.doesNotMatch(source, /En savoir plus/);
});

test("MSE-25.179 managed commercial links cover published cards and the explicit Business Travel managed card", () => {
  assert.match(source, /\[item\?\.title, item\?\.label, item\?\.name, item\?\.text\]/);
  assert.match(source, /managed = MANAGED_FEATURE_ACTIONS\.find/);
  assert.match(source, /managed \? \{ href: `\$\{root\}\/\$\{managed\.slug\}`, label: managed\.label \} : null/);
  assert.match(source, /MANAGED_FEATURE_ACTIONS\[0\]\.pattern\.test\(searchable\)/);
});

test("MSE-25.179 related generic navigation remains published-only", () => {
  assert.match(source, /uniquePublishedNavigation\(site\)/);
  assert.match(source, /pageHref\(site\.slug, page\)/);
  assert.match(source, /page\.title/);
  assert.doesNotMatch(source, /Destinations conseillées/);
  assert.doesNotMatch(source, /Demander un conseil personnalisé/);
});
