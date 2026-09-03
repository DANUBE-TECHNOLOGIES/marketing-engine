import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

test("MSE-25.117 marker documents SEO-only runtime scope", () => {
  const marker = fs.readFileSync(path.join(root, ".mse-25-117"), "utf8");
  assert.match(marker, /LOCAL_SEARCH_PERFORMANCE/);
  assert.match(marker, /audit-local-search-contract/);
});
