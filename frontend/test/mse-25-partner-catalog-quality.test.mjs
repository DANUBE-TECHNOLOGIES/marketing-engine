import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");

test("partner catalogue has no duplicate identity or unknown category", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/partner-catalog-quality.mjs"],
    { cwd: frontendRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);

  assert.equal(payload.policy.publicUx, "simple-first-progressive-details");
  assert.equal(payload.policy.logos, "individual-assets-only");
  assert.deepEqual(payload.structuralErrors.duplicateIds, []);
  assert.deepEqual(payload.structuralErrors.duplicateNames, []);
  assert.deepEqual(payload.structuralErrors.unknownCategories, []);
  assert.equal(payload.summary.categories, 5);
  assert.ok(payload.summary.partners > 0);
  assert.ok(payload.summary.withDetails > 0);
});
