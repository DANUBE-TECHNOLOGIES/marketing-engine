import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const client = fs.readFileSync(path.join(root, "app/indexation/performance/SearchPerformanceClient.js"), "utf8");
const api = fs.readFileSync(path.join(root, "lib/indexation-api.js"), "utf8");
const proxy = fs.readFileSync(path.join(root, "app/api/indexation/route.js"), "utf8");

test("MSE-25.23 sends the selected minisite identity to the backend", () => {
  assert.match(client, /siteSlug: selectedSite\.siteSlug/);
  assert.match(api, /siteSlug/);
  assert.match(proxy, /"siteSlug"/);
});

test("MSE-25.23 surfaces local SEO intent without replacing the historical SEO score", () => {
  assert.match(client, /score SEO/);
  assert.match(client, /score local/);
  assert.match(client, /Intention locale forte/);
  assert.match(client, /localIntent/);
  assert.match(client, /localPriorityScore/);
});

test("MSE-25.23 remains human-controlled", () => {
  assert.match(client, /Aucune action n’est appliquée automatiquement/);
  assert.doesNotMatch(client, /publishPage|updatePage|savePage|pageBuilder/);
});
