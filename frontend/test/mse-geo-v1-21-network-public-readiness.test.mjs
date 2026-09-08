import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/readiness/page.js", import.meta.url),
  "utf8"
);
const layout = fs.readFileSync(
  new URL("../app/knowledge/geo/network/layout.js", import.meta.url),
  "utf8"
);

test("public readiness dashboard consumes one read-only network endpoint", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/public-readiness/);
  assert.match(page, /x-tenant-slug/);
  assert.match(page, /read-only/i);
  assert.match(page, /Mini-sites publiés/);
  assert.match(page, /Person liées Knowledge/);
  assert.match(page, /Zones areaServed/);
  assert.doesNotMatch(page, /method:\s*["']POST["']/);
  assert.doesNotMatch(page, /method:\s*["']DELETE["']/);
});

test("readiness explicitly keeps knowsAbout informational rather than inferred", () => {
  assert.match(page, /knowsAbout/);
  assert.match(page, /purement informatif/i);
  assert.match(page, /ne dégrade pas la readiness/i);
  assert.match(page, /expertise n’est requise ou inférée/i);
});

test("network GEO layout exposes agencies, people and readiness without per-agency navigation", () => {
  assert.match(layout, /\/knowledge\/geo\/network"/);
  assert.match(layout, /\/knowledge\/geo\/network\/people/);
  assert.match(layout, /\/knowledge\/geo\/network\/readiness/);
  assert.match(layout, /Readiness publique/);
});
