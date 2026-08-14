import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

test("MSE-25.20 performance page is internal and read-only", () => {
  const page = read("app/indexation/performance/page.js");
  const client = read("app/indexation/performance/SearchPerformanceClient.js");
  assert.match(page, /index:\s*false/);
  assert.match(page, /follow:\s*false/);
  assert.match(client, /indexationApi\.performance/);
  assert.doesNotMatch(client, /indexationApi\.prepare/);
  assert.doesNotMatch(client, /indexationApi\.approve/);
  assert.doesNotMatch(client, /indexationApi\.submit/);
});

test("MSE-25.20 scopes Search Analytics to the selected minisite root and children", () => {
  const client = read("app/indexation/performance/SearchPerformanceClient.js");
  const proxy = read("app/api/indexation/route.js");
  const api = read("lib/indexation-api.js");
  assert.match(client, /pagePrefixFromSitemap/);
  assert.match(client, /replace\(\/\\\/sitemap/);
  assert.match(client, /pagePrefix:/);
  assert.match(proxy, /pagePrefix/);
  assert.match(api, /pagePrefix/);
});

test("MSE-25.20 exposes metrics, period deltas and SEO opportunities", () => {
  const client = read("app/indexation/performance/SearchPerformanceClient.js");
  assert.match(client, /clics Google/);
  assert.match(client, /impressions/);
  assert.match(client, /CTR/);
  assert.match(client, /position moyenne/);
  assert.match(client, /vs période précédente/);
  assert.match(client, /Opportunités SEO prioritaires/);
  assert.match(client, /row\.impressions >= 20/);
  assert.match(client, /row\.position >= 4/);
  assert.match(client, /row\.position <= 20/);
  assert.match(client, /Principales requêtes/);
  assert.match(client, /Pages les plus visibles/);
});
