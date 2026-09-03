import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("MSE-25.19 frontend exposes Search Console sitemap status as read only", () => {
  const api = read("lib/indexation-api.js");
  const proxy = read("app/api/indexation/route.js");
  const client = read("app/indexation/status/SearchConsoleStatusClient.js");

  assert.match(api, /status:\s*\(\{ siteSlug, siteUrl \}\) => read\(["']status["']/);
  assert.match(proxy, /search-console-submissions\/sites\/\$\{encodeURIComponent\(siteSlug\)\}\/status/);
  assert.match(client, /indexationApi\.status/);
  assert.doesNotMatch(client, /indexationApi\.prepare/);
  assert.doesNotMatch(client, /indexationApi\.approve/);
  assert.doesNotMatch(client, /indexationApi\.submit/);
  assert.match(client, /Lecture seule/);
});

test("MSE-25.19 status page is internal noindex", () => {
  const page = read("app/indexation/status/page.js");
  assert.match(page, /robots:/);
  assert.match(page, /index:\s*false/);
  assert.match(page, /follow:\s*false/);
  assert.match(page, /SearchConsoleStatusClient/);
});
