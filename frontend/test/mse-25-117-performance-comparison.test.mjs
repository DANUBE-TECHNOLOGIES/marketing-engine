import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-performance.js"), "utf8");

test("MSE-25.117 compares impressions clicks CTR and average position", () => {
  assert.match(source, /impressionsDelta/);
  assert.match(source, /clicksDelta/);
  assert.match(source, /ctrDelta/);
  assert.match(source, /positionDelta/);
});

test("MSE-25.117 performance comparison stays read-only", () => {
  assert.doesNotMatch(source, /fetch\(|POST|PUT|PATCH|DELETE|googleapis/i);
});
