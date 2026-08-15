import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const client = fs.readFileSync(path.join(root, "app/indexation/local-seo/LocalSeoCoverageClient.js"), "utf8");
const proxy = fs.readFileSync(path.join(root, "app/api/indexation/route.js"), "utf8");
const api = fs.readFileSync(path.join(root, "lib/indexation-api.js"), "utf8");

test("MSE-25.24 exposes the published local coverage audit in the cockpit", () => {
  assert.match(proxy, /minisite-structured-data\/local-seo-coverage/);
  assert.match(api, /localSeoCoverage/);
  assert.match(client, /Couverture SEO locale/);
  assert.match(client, /Ville principale, title, meta, contenu publié/);
});

test("MSE-25.24 remains diagnostic and does not create local doorway pages", () => {
  assert.match(client, /aucune doorway page générée automatiquement/i);
  assert.doesNotMatch(client, /createPage|publishPage|updatePage|savePage/);
});
