import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const client = fs.readFileSync(path.join(root, "app/indexation/local-content/LocalContentUniquenessClient.js"), "utf8");
const proxy = fs.readFileSync(path.join(root, "app/api/indexation/route.js"), "utf8");
const api = fs.readFileSync(path.join(root, "lib/indexation-api.js"), "utf8");
const page = fs.readFileSync(path.join(root, "app/indexation/page.js"), "utf8");

test("MSE-25.25 exposes cross-agency local content uniqueness in the cockpit", () => {
  assert.match(proxy, /minisite-structured-data\/local-content-uniqueness/);
  assert.match(api, /localContentUniqueness/);
  assert.match(page, /\/indexation\/local-content/);
  assert.match(client, /Unicité des contenus locaux/);
  assert.match(client, /Risque de duplication/);
});

test("MSE-25.25 can turn duplicate-content risk into a human SEO task", () => {
  assert.match(client, /createWorkItem/);
  assert.match(client, /sourceType: "local-content-uniqueness"/);
  assert.match(client, /workKey: `local-content-uniqueness:/);
  assert.match(client, /Créer une tâche SEO/);
});

test("MSE-25.25 remains a human-controlled audit", () => {
  assert.match(client, /aucune réécriture automatique/i);
  assert.match(client, /aucun contenu publié sans validation humaine/i);
  assert.doesNotMatch(client, /createPage|publishPage|updatePage|savePage|autoRewrite/);
});
