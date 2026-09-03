import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-thresholds.js"), "utf8");

test("MSE-25.117 local SEO thresholds are explicit and deterministic", () => {
  assert.match(source, /minimumLocalImpressionsForCtrAction: 5/);
  assert.match(source, /minimumCommercialIntentCoverage: 5/);
  assert.match(source, /targetReadinessScore: 100/);
});
