import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/page.js", import.meta.url),
  "utf8"
);

test("network GEO dashboard is read-only and consumes the single network report", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/report/);
  assert.match(page, /x-tenant-slug/);
  assert.match(page, /mondescale/);
  assert.match(page, /lecture seule/i);
  assert.match(page, /Agences sources/);
  assert.match(page, /Actions nécessaires/);
  assert.match(page, /Conseillers liés/);
  assert.match(page, /À lier/);
  assert.doesNotMatch(page, /method:\s*["']POST["']/);
  assert.doesNotMatch(page, /\/apply/);
});
