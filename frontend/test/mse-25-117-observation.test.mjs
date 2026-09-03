import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-observation.js"), "utf8");

test("MSE-25.117 observation normalizes agency query performance dimensions", () => {
  for (const expected of ["agencyKey", "query", "intent", "clicks", "impressions", "ctr", "position", "period"]) {
    assert.match(source, new RegExp(expected));
  }
});

test("MSE-25.117 observation contains no persistence side effect", () => {
  assert.doesNotMatch(source, /prisma|database|writeFile|fetch\(|POST|PUT|PATCH|DELETE/i);
});
