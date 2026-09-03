import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const client = fs.readFileSync(path.join(root, "app/indexation/local-seo/LocalSeoCoverageClient.js"), "utf8");

test("MSE-25.26 exposes semantic depth and its five local relevance dimensions", () => {
  assert.match(client, /MSE-25\.26 · Local Semantic Depth/);
  assert.match(client, /contenus sémantiquement profonds/);
  assert.match(client, /services/);
  assert.match(client, /expertise/);
  assert.match(client, /preuves/);
  assert.match(client, /ancrage territorial/);
});

test("MSE-25.26 remains diagnostic and human-controlled", () => {
  assert.match(client, /aucune doorway page générée automatiquement/i);
  assert.match(client, /Ajouter à la file SEO/);
  assert.doesNotMatch(client, /publishPage|updatePage|savePage|autoRewrite/);
});
