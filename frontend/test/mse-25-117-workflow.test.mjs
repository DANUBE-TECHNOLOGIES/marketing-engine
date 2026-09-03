import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const source = fs.readFileSync(path.join(root, ".github/workflows/mse-25-117-local-search.yml"), "utf8");

test("MSE-25.117 PR workflow runs the consolidated verdict", () => {
  assert.match(source, /pull_request:/);
  assert.match(source, /node-version: 22/);
  assert.match(source, /npm ci/);
  assert.match(source, /node scripts\/mse-25-117-verdict\.mjs/);
});
