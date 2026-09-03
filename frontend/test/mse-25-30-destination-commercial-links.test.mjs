import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const renderer = fs.readFileSync(
  path.join(root, "components/destination/DestinationPage.js"),
  "utf8"
);

test("MSE-25.30 destination pages derive commercial links from real published site pages", () => {
  assert.match(renderer, /function commercialPageLinks\(site\)/);
  assert.match(renderer, /Array\.isArray\(site\?\.pages\)/);
  assert.match(renderer, /COMMERCIAL_PAGE_INTENTS/);
  assert.match(renderer, /commercialLinks\.map/);
});

test("MSE-25.30 destination pages do not hard-code commercial page URLs", () => {
  assert.doesNotMatch(renderer, /const\s+cruisesPath\s*=\s*`\$\{root\}\/croisieres`/);
  assert.doesNotMatch(renderer, /const\s+circuitsPath\s*=\s*`\$\{root\}\/circuits`/);
  assert.match(renderer, /href:\s*`\$\{root\}\/\$\{slug\}`/);
});

test("MSE-25.30 destination CTA anchors remain descriptive and local", () => {
  assert.match(renderer, /Découvrir nos \{item\.label\}/);
  assert.match(renderer, /city \? `à \$\{city\}`/);
});
