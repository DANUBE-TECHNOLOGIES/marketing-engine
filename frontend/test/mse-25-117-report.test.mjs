import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-report.js"), "utf8");

test("MSE-25.117 agency report combines readiness and Search Console opportunities", () => {
  assert.match(source, /localSearchReadiness/);
  assert.match(source, /topLocalSearchOpportunities/);
  assert.match(source, /readinessScore/);
  assert.match(source, /cannibalisation/);
  assert.match(source, /opportunities/);
});

test("MSE-25.117 report is read-only", () => {
  assert.doesNotMatch(source, /fetch\(|writeFile|POST|PUT|PATCH|DELETE/i);
});
