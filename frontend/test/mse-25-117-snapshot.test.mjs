import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-snapshot.js"), "utf8");

test("MSE-25.117 snapshot is versioned and network-wide", () => {
  assert.match(source, /LOCAL_SEARCH_CONTRACT_VERSION/);
  assert.match(source, /LOCAL_SEARCH_BASELINE_DATE/);
  assert.match(source, /localSearchNetworkSummary/);
  assert.match(source, /generatedAt/);
});
