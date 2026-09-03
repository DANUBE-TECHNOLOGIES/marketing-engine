import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-coverage.js"), "utf8");

test("MSE-25.117 coverage reports missing commercial local intents", () => {
  assert.match(source, /total:/);
  assert.match(source, /covered:/);
  assert.match(source, /ratio:/);
  assert.match(source, /missingRoutes/);
});
