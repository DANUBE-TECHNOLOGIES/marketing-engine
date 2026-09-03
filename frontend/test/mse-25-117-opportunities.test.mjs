import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-opportunities.js"), "utf8");

test("MSE-25.117 opportunities prioritize commercial visibility with low CTR", () => {
  assert.match(source, /opportunityScore/);
  assert.match(source, /impressions \* \(1 - Math\.min\(1, ctr\)\)/);
  assert.match(source, /agency-local/);
  assert.match(source, /commercial/);
});

test("MSE-25.117 opportunity engine remains read-only", () => {
  assert.doesNotMatch(source, /fetch\(|POST|PUT|PATCH|DELETE|writeFile/i);
});
