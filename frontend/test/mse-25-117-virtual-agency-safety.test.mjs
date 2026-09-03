import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const signals = fs.readFileSync(path.join(root, "lib/seo/local-search-signals.js"), "utf8");
const jsonLd = fs.readFileSync(path.join(root, "lib/seo/json-ld.js"), "utf8");

test("MSE-25.117 does not hard-code a physical address for incomplete or virtual agencies", () => {
  assert.doesNotMatch(signals, /streetAddress:\s*["']/);
  assert.doesNotMatch(jsonLd, /streetAddress:\s*["'][^"']+["']/);
  assert.match(jsonLd, /streetAddress: agency\.address \|\| site\.address/);
});
