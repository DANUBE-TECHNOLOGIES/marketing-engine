import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(
  new URL("../app/knowledge/geo/network/people/page.js", import.meta.url),
  "utf8"
);

test("network Person dashboard still consumes the read-only reconciliation report", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/people-report/);
  assert.match(page, /x-tenant-slug/);
  assert.match(page, /Analyse de tous les blocs équipe publiés/i);
  assert.match(page, /Conseillers explicites/);
  assert.match(page, /Person exactes/);
  assert.match(page, /Nouveaux candidats/);
  assert.match(page, /À vérifier/);
});

test("V1.18 reconciliation remains distinct from V1.19 controlled mutation path", () => {
  assert.match(page, /\/api\/knowledge\/geo\/network\/people-report/);
  assert.match(page, /\/api\/knowledge\/geo\/network\/people-apply-preview/);
  assert.match(page, /\/api\/knowledge\/geo\/network\/apply-people/);
  assert.doesNotMatch(page, /method:\s*["']DELETE["']/);
  assert.match(page, /aucune expertise n’est générée/i);
  assert.match(page, /cas ambigu/i);
});
