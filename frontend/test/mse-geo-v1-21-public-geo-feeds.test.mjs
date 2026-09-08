import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const agencyRoute = fs.readFileSync(
  new URL("../app/agence/[siteSlug]/geo.json/route.js", import.meta.url),
  "utf8"
);
const networkRoute = fs.readFileSync(
  new URL("../app/geo/network.json/route.js", import.meta.url),
  "utf8"
);

test("agency GEO feed is public GET proxy on canonical agency path", () => {
  assert.match(agencyRoute, /export async function GET/);
  assert.match(agencyRoute, /minisite-structured-data\/sites\/.*\/geo/);
  assert.match(agencyRoute, /x-tenant-slug/);
  assert.match(agencyRoute, /revalidate:\s*300/);
  assert.match(agencyRoute, /stale-while-revalidate=3600/);
  assert.doesNotMatch(agencyRoute, /method:\s*["']POST["']/);
});

test("network GEO index is public GET proxy and read-only", () => {
  assert.match(networkRoute, /export async function GET/);
  assert.match(networkRoute, /minisite-structured-data\/geo\/network/);
  assert.match(networkRoute, /x-tenant-slug/);
  assert.match(networkRoute, /revalidate:\s*300/);
  assert.match(networkRoute, /stale-while-revalidate=3600/);
  assert.doesNotMatch(networkRoute, /method:\s*["']POST["']/);
});
