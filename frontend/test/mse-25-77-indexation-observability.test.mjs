import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function read(relativePath) { return fs.readFileSync(path.join(root, relativePath), "utf8"); }

test("MSE-25.77 observability cockpit is internal and read only", () => {
  const page = read("app/indexation/observability/page.js");
  const client = read("app/indexation/observability/IndexationObservabilityClient.js");

  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(client, /indexationApi\.candidates\(\)/);
  assert.match(client, /indexationApi\.properties\(\)/);
  assert.match(client, /indexationApi\.history/);
  assert.match(client, /indexationApi\.status/);
  assert.match(client, /indexationApi\.performance/);
  assert.doesNotMatch(client, /indexationApi\.prepare/);
  assert.doesNotMatch(client, /indexationApi\.approve/);
  assert.doesNotMatch(client, /indexationApi\.submit/);
  assert.doesNotMatch(client, /indexationApi\.createWorkItem/);
  assert.doesNotMatch(client, /indexationApi\.transitionWorkItem/);
});

test("MSE-25.77 never equates missing performance rows with deindexation", () => {
  const client = read("app/indexation/observability/IndexationObservabilityClient.js");
  assert.match(client, /SEARCH_DATA_AVAILABLE/);
  assert.match(client, /NO_SEARCH_DATA_YET/);
  assert.match(client, /absence ne prouve ni une désindexation ni une erreur SEO/);
  assert.match(client, /signifie uniquement que Search Console retourne des lignes/);
  assert.doesNotMatch(client, /NOT_INDEXED|DEINDEXED|NON_INDEXEE|NON_INDEXÉE/);
});

test("MSE-25.77 is exposed from the internal indexation cockpit", () => {
  const cockpit = read("app/indexation/page.js");
  assert.match(cockpit, /href=["']\/indexation\/observability["']/);
});
