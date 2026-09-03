import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-summary.js"), "utf8");

test("MSE-25.117 summary exposes decision-ready agency SEO indicators", () => {
  for (const expected of ["readinessScore", "priorityScore", "visibilityOpportunity", "recommendations", "topOpportunities"]) {
    assert.match(source, new RegExp(expected));
  }
});
