import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-version.js"), "utf8");

test("MSE-25.117 local search contract is versioned against its baseline", () => {
  assert.match(source, /MSE-25\.117/);
  assert.match(source, /2026-09-03/);
});
