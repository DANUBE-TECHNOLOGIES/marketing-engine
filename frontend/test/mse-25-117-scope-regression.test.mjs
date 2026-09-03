import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const files = [
  "lib/seo/local-search-intent.js",
  "lib/seo/local-search-intent-map.js",
  "lib/seo/local-search-signals.js",
  "lib/seo/local-search-readiness.js",
  "lib/seo/local-search-page-contract.js",
  "lib/seo/local-search-performance.js",
  "lib/seo/search-console-local-baseline.js",
];

test("MSE-25.117 runtime additions are side-effect free SEO helpers", () => {
  const source = files.map((file) => fs.readFileSync(path.join(root, file), "utf8")).join("\n");
  assert.doesNotMatch(source, /fetch\(|axios|prisma|database|fs\.|writeFile|unlink|redirect\(|notFound\(/i);
  assert.doesNotMatch(source, /<main|<section|className|style=|background/i);
});
