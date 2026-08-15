import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const performance = fs.readFileSync(path.join(root, "app/indexation/performance/SearchPerformanceClient.js"), "utf8");
const queue = fs.readFileSync(path.join(root, "app/indexation/work-queue/SeoWorkQueueClient.js"), "utf8");
const proxy = fs.readFileSync(path.join(root, "app/api/indexation/route.js"), "utf8");
const api = fs.readFileSync(path.join(root, "lib/indexation-api.js"), "utf8");

test("MSE-25.22 lets an operator create a manual task from a ranked opportunity", () => {
  assert.match(performance, /Ajouter à la file SEO/);
  assert.match(performance, /createWorkItem/);
  assert.match(api, /createWorkItem/);
  assert.match(proxy, /seo-opportunity-work-queue/);
});

test("MSE-25.22 exposes the controlled lifecycle without public-content automation", () => {
  assert.match(queue, /Nouvelle → Planifiée → Réalisée → Mesurée/);
  assert.match(queue, /transitionWorkItem/);
  assert.match(queue, /aucune mutation automatique/i);
  assert.doesNotMatch(queue, /publishPage|updatePage|savePage|pageBuilder/);
});

test("MSE-25.22 keeps Search Console submission operations separate from SEO work items", () => {
  assert.match(proxy, /case "createWorkItem"/);
  assert.match(proxy, /case "transitionWorkItem"/);
  assert.match(proxy, /case "approve"/);
  assert.match(proxy, /case "submit"/);
  assert.doesNotMatch(queue, /\.approve\(|\.submit\(/);
});
