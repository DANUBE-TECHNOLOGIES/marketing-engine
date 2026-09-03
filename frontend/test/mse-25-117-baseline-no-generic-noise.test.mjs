import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/search-console-local-baseline.js"), "utf8");

test("MSE-25.117 operational baseline focuses on local/brand signals rather than broad generic noise", () => {
  assert.doesNotMatch(source, /query:\s*"voyages"/);
  assert.doesNotMatch(source, /query:\s*"fram"/);
  assert.match(source, /agence de voyage dax/);
  assert.match(source, /agence de voyage nevers/);
});
