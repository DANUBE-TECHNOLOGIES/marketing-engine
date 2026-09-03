import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "lib/seo/local-search-network-summary.js"), "utf8");

test("MSE-25.117 network summary exposes agency readiness and priorities", () => {
  for (const expected of ["agencyCount", "readyCount", "needsWorkCount", "averageReadiness", "priorities"]) {
    assert.match(source, new RegExp(expected));
  }
  assert.match(source, /b\.priorityScore - a\.priorityScore/);
});
