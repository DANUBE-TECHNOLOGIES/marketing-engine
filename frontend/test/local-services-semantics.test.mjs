import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const features = await readFile(
  new URL("../components/public-site/renderers/FeaturesV2Renderer.js", import.meta.url),
  "utf8"
);
const sections = await readFile(
  new URL("../components/public-site/PublicSiteSections.js", import.meta.url),
  "utf8"
);

test("service feature fallback carries local relevance without overriding editorial copy", () => {
  assert.match(features, /Nos services voyage à \$\{city\}/);
  assert.match(features, /content\.introduction \|\|/);
  assert.match(features, /getSectionTitle/);
});

test("registered renderers receive the site context needed for local service copy", () => {
  assert.match(sections, /<RegistryRenderer/);
  assert.match(sections, /site=\{site\}/);
});

test("service cards preserve a semantic heading hierarchy", () => {
  assert.match(features, /<h2>/);
  assert.match(features, /<h3>/);
  assert.match(features, /<article/);
});
