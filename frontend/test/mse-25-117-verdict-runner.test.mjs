import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
const source = fs.readFileSync(path.join(root, "scripts/mse-25-117-verdict.mjs"), "utf8");

test("MSE-25.117 verdict requires SEO tests lint and build", () => {
  for (const expected of ["LOCAL_SEARCH_CONTRACT", "LOCAL_SEARCH_TESTS", "INDEXATION", "INDEXATION_PERFORMANCE", "LINT", "BUILD"]) {
    assert.match(source, new RegExp(expected));
  }
  assert.match(source, /MSE_25_117=/);
  assert.match(source, /process\.exit\(failed \? 1 : 0\)/);
});
