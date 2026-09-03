import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(
  new URL("../app/api/website-builder/inspirations/route.js", import.meta.url),
  "utf8"
);

test("published inspirations can be cached briefly by shared caches", () => {
  assert.match(route, /public, max-age=30, s-maxage=120, stale-while-revalidate=300/);
});

test("inspiration backend failures are never cached", () => {
  assert.match(route, /response\.ok[\s\S]*?\? "public, max-age=30, s-maxage=120, stale-while-revalidate=300"[\s\S]*?: "no-store"/);
  assert.match(route, /status: 502[\s\S]*?"cache-control": "no-store"/);
});
