import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const client = fs.readFileSync(path.join(root, "app/indexation/local-seo/LocalSeoCoverageClient.js"), "utf8");

test("MSE-25.27 displays local commercial intent coverage per agency", () => {
  assert.match(client, /Local Search Intent Coverage/);
  assert.match(client, /Intentions locales/);
  assert.match(client, /couverture d’intentions forte/);
  assert.match(client, /coveredIntentCount/);
  assert.match(client, /localQualified/);
});

test("MSE-25.27 keeps intent gaps actionable through the human SEO queue", () => {
  assert.match(client, /gap\.intent/);
  assert.match(client, /Ajouter à la file SEO/);
  assert.doesNotMatch(client, /publishPage|savePage|autoPublish/);
});
