import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const features = read("components/public-site/renderers/FeaturesV2Renderer.js");
const faq = read("components/public-site/renderers/FaqRenderer.js");
const team = read("components/public-site/renderers/TeamRenderer.js");
const localContext = read("components/public-site/LocalContentContext.js");

test("shared service cards preserve configured links and fall back to contact", () => {
  assert.match(features, /item\?\.href \|\| item\?\.url \|\| item\?\.link/);
  assert.match(features, /configuredHref \|\| `\$\{root\}\/contact`/);
  assert.match(features, /Parler de votre projet/);
  assert.match(features, /item\?\.ctaLabel \|\| item\?\.linkLabel \|\| item\?\.actionLabel/);
  assert.doesNotMatch(features, /Bois-Colombes|Dax|Gien|Lamorlaye|Maurepas|Nevers|Ozoir/);
});

test("shared FAQ keeps configured content and suppresses incomplete rows", () => {
  assert.match(faq, /getItems\(section, \["items", "questions", "faqs"\]\)/);
  assert.match(faq, /item\?\.question \|\| item\?\.title/);
  assert.match(faq, /item\?\.answer \|\| item\?\.text \|\| item\?\.description/);
  assert.match(faq, /filter\(\(item\) => item\.question && item\.answer\)/);
  assert.match(faq, /questions\\s\+fr\[eé\]quentes/);
  assert.doesNotMatch(faq, /parking|garantie du meilleur prix|sans risque/);
});

test("advisor profiles expose optional factual enrichment without invented defaults", () => {
  assert.match(team, /member\?\.presentation, member\?\.description, member\?\.bio, member\?\.about/);
  assert.match(team, /member\?\.specialties, member\?\.specialites, member\?\.expertise, member\?\.expertises/);
  assert.match(team, /member\?\.favoriteDestinations/);
  assert.match(team, /member\?\.yearsExperience \?\? member\?\.experienceYears/);
  assert.match(team, /if \(!experience && !specialties\.length && !destinations\.length\) return null/);
  assert.doesNotMatch(team, /Céline|Sylvie|Marie-Claire|Stéphanie|Prescillia|Maïlys|Princess|Anisia/);
});

test("local proximity SEO remains centralized and unchanged in principle", () => {
  assert.match(localContext, /resolvedTargetCities\(site, \{ limit: 4 \}\)/);
  assert.match(localContext, /Navigation locale autour de/);
  assert.match(localContext, /Agence de voyages à \{city\}/);
});

test("MSE-25.123 does not introduce a fake booking promise", () => {
  const combined = `${features}\n${faq}\n${team}`;
  assert.doesNotMatch(combined, /Prendre rendez-vous|Réserver un rendez-vous|booking\/|appointment\//i);
});
