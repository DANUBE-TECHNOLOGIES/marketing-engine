import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("MSE-25.21 consumes backend-ranked opportunities instead of duplicating the score", () => {
  const client = read("app/indexation/performance/SearchPerformanceClient.js");
  assert.match(client, /performance\?\.opportunities/);
  assert.match(client, /opportunity\.score/);
  assert.match(client, /opportunity\.priority/);
  assert.match(client, /opportunity\.action\?\.label/);
  assert.doesNotMatch(client, /row\.impressions\s*>=\s*20/);
  assert.doesNotMatch(client, /row\.position\s*>=\s*4/);
});

test("MSE-25.21 remains recommendation-only", () => {
  const client = read("app/indexation/performance/SearchPerformanceClient.js");
  assert.match(client, /Aucune action n’est appliquée automatiquement/);
  assert.doesNotMatch(client, /indexationApi\.prepare/);
  assert.doesNotMatch(client, /indexationApi\.approve/);
  assert.doesNotMatch(client, /indexationApi\.submit/);
});

test("MSE-25.21 clears stale performance when the analysis scope changes", () => {
  const client = read("app/indexation/performance/SearchPerformanceClient.js");
  const resets = client.match(/setPerformance\(null\)/g) || [];
  assert.ok(resets.length >= 4);
});
