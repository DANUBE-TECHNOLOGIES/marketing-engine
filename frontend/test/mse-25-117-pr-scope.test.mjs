import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const runtimeDir = path.join(root, "lib/seo");

const files = fs.readdirSync(runtimeDir).filter((name) => name.startsWith("local-search-") || name === "search-console-local-baseline.js");

test("MSE-25.117 local-search runtime modules stay in SEO library", () => {
  assert.ok(files.length >= 10);
  for (const name of files) assert.match(name, /\.js$/);
});
