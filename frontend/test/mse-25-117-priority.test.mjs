import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-priority.js"), "utf8");

test("MSE-25.117 agency priority combines readiness gap and visibility opportunity", () => {
  assert.match(source, /readinessGap/);
  assert.match(source, /visibilityOpportunity/);
  assert.match(source, /rankAgenciesForLocalSearch/);
  assert.match(source, /b\.priority\.score - a\.priority\.score/);
});

test("MSE-25.117 priority engine remains advisory", () => {
  assert.doesNotMatch(source, /redirect\(|notFound\(|process\.exit|writeFile|fetch\(/i);
});
