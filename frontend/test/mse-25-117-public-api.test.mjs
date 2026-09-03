import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-index.js"), "utf8");

test("MSE-25.117 unified SEO API exposes readiness reporting and measurement", () => {
  for (const expected of ["buildLocalSearchPageContract", "localSearchReadiness", "buildLocalSearchReport", "normalizeLocalSearchObservation", "topLocalSearchOpportunities", "compareLocalSearchPerformance"]) {
    assert.match(source, new RegExp(expected));
  }
});
