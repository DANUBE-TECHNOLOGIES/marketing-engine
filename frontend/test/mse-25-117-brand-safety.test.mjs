import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const seo = fs.readFileSync(path.join(root, "lib/seo/local-page-seo.js"), "utf8");
const baseline = fs.readFileSync(path.join(root, "lib/seo/search-console-local-baseline.js"), "utf8");

test("MSE-25.117 observed FRAM queries remain measurement data, not forced metadata", () => {
  assert.match(baseline, /fram nevers/);
  assert.match(baseline, /fram gien/);
  assert.doesNotMatch(seo, /FRAM/);
});
