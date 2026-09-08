import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/people/page.js", import.meta.url),
  "utf8"
);

test("network Person dashboard consumes one read-only people report", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/people-report/);
  assert.match(page, /x-tenant-slug/);
  assert.match(page, /lecture seule/i);
  assert.match(page, /Conseillers explicites/);
  assert.match(page, /Person exactes/);
  assert.match(page, /Nouveaux candidats/);
  assert.match(page, /À vérifier/);
});

test("network Person dashboard exposes no mutation path", () => {
  assert.doesNotMatch(page, /method:\s*["']POST["']/);
  assert.doesNotMatch(page, /method:\s*["']DELETE["']/);
  assert.doesNotMatch(page, /\/apply/);
  assert.match(page, /aucune Person, liaison ou expertise n’est créée/i);
});
