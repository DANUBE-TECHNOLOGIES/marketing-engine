import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const renderer = fs.readFileSync(
  path.join(root, "components/public-site/renderers/StatsRenderer.js"),
  "utf8"
);

test("stats fallback stays factual instead of claiming expertise", () => {
  assert.match(renderer, /"Quelques chiffres"/);
  assert.doesNotMatch(renderer, /Notre expertise en quelques chiffres/);
});

test("stats render only complete published value-label pairs", () => {
  assert.match(renderer, /filter\(\(item\) => item\?\.value != null && item\?\.label\)/);
  assert.match(renderer, /if \(!items\.length\) return null/);
});
