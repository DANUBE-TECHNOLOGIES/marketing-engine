import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const client = fs.readFileSync(path.join(root, "app/indexation/local-seo/LocalSeoCoverageClient.js"), "utf8");

test("MSE-25.28 shows each local intent and its concrete target page", () => {
  assert.match(client, /MSE-25\.28 · Local Intent Target Mapping/);
  assert.match(client, /Intentions locales → cibles/);
  assert.match(client, /targetLabel/);
  assert.match(client, /aucune cible locale claire/);
  assert.match(client, /intention diffuse/);
});

test("MSE-25.28 keeps target mapping diagnostic and human-controlled", () => {
  assert.match(client, /Ajouter à la file SEO/);
  assert.doesNotMatch(client, /publishPage|savePage|autoPublish|createPage/);
});
