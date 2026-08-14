import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const team = await readFile(new URL("../components/public-site/renderers/TeamRenderer.js", import.meta.url), "utf8");
const contact = await readFile(new URL("../components/public-site/renderers/ContactRenderer.js", import.meta.url), "utf8");
const reviews = await readFile(new URL("../components/public-site/renderers/ReviewsRenderer.js", import.meta.url), "utf8");
const inspiration = await readFile(new URL("../app/agence/[siteSlug]/inspiration/page.js", import.meta.url), "utf8");

test("team renderer localizes the agency journey", () => {
  assert.match(team, /agence de voyages à/);
  assert.match(team, /services/);
  assert.match(team, /destinations/);
  assert.match(team, /contact/);
});

test("contact renderer keeps local NAP and area context visible", () => {
  assert.match(contact, /<address>/);
  assert.match(contact, /agency\.phone/);
  assert.match(contact, /agency\.email/);
  assert.match(contact, /resolvedTargetCities/);
});

test("reviews renderer links social proof to stable agency pages", () => {
  assert.match(reviews, /Avis Google/);
  assert.match(reviews, /siteHref\(site\)/);
  assert.match(reviews, /services/);
  assert.match(reviews, /contact/);
});

test("inspiration index carries local context in visible content", () => {
  assert.match(inspiration, /Inspirations voyage depuis/);
  assert.match(inspiration, /resolvedTargetCities/);
  assert.match(inspiration, /destinationsPath/);
  assert.match(inspiration, /servicesPath/);
});
