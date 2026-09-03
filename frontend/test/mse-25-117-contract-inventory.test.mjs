import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const required = [
  "lib/seo/local-search-intent.js",
  "lib/seo/local-search-signals.js",
  "lib/seo/local-search-intent-map.js",
  "lib/seo/local-search-readiness.js",
  "lib/seo/local-search-page-contract.js",
  "lib/seo/local-search-query-classifier.js",
  "lib/seo/local-search-opportunities.js",
  "lib/seo/local-search-performance.js",
  "lib/seo/local-search-agency-key.js",
  "lib/seo/local-search-observation.js",
  "lib/seo/local-search-report.js",
  "lib/seo/search-console-local-baseline.js",
  "scripts/audit-local-search-contract.mjs",
  "scripts/mse-25-117-verdict.mjs",
];

test("MSE-25.117 complete local search contract inventory is present", () => {
  for (const relative of required) {
    assert.equal(fs.existsSync(path.join(root, relative)), true, `missing ${relative}`);
  }
});
