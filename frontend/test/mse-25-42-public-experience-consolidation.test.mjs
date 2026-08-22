import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = path.resolve(import.meta.dirname, "..");

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

test("MSE-25.42 keeps the flexible payment block compact and contrasted", () => {
  const css = read("components/public-site/premium-sections.css");

  assert.match(css, /public-site-flexible-payment--compact/);
  assert.match(css, /padding-block:\s*clamp\(38px/);
  assert.match(css, /public-site-shell \.public-site-cta/);
  assert.match(css, /color:\s*#fff/);
});

test("MSE-25.42 reduces destination and team visual height without hiding content", () => {
  const css = read("components/public-site/premium-sections.css");

  assert.match(css, /public-site-destination-card[\s\S]*min-height:\s*315px/);
  assert.match(css, /public-site-team-portrait[\s\S]*clamp\(160px/);
  assert.match(css, /public-site-shell \.public-site-section[\s\S]*padding-block:\s*clamp\(52px/);
});

test("MSE-25.42 presents internal links as secondary editorial navigation", () => {
  const css = read("components/public-site/public-readability-fixes.css");

  assert.match(css, /\.public-site-related-links a[\s\S]*font-size:\s*0\.78rem/);
  assert.match(css, /text-decoration:\s*none/);
  assert.match(css, /:focus-visible/);
});

test("MSE-25.42 compacts the home local coverage instead of duplicating a long SEO section", () => {
  const source = read("components/public-site/LocalSeoAreaLinks.js");

  assert.match(source, /public-site-local-area-compact/);
  assert.match(source, /Votre agence à \{city\} et ses environs/);
  assert.match(source, /Nos services/);
  assert.doesNotMatch(source, /Notre secteur de proximité s’étend également/);
});

test("MSE-25.42 public renderers keep media-aware destination and team contracts", () => {
  const destinations = read("components/public-site/renderers/DestinationsRenderer.js");
  const team = read("components/public-site/renderers/TeamRenderer.js");

  assert.match(destinations, /item\.imageUrl/);
  assert.match(destinations, /item\.heroImage/);
  assert.match(team, /member\.imageUrl/);
  assert.match(team, /member\.photoUrl/);
});
