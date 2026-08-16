import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");

test("confirmed partners have exactly one category-aligned specialized editorial detail source", () => {
  const result = spawnSync(process.execPath, ["scripts/partner-detail-source-audit.mjs"], {
    cwd: frontendRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stdout || result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.policy, "one-category-aligned-specialized-source-per-confirmed-partner");
  assert.equal(payload.summary.duplicateSources, 0);
  assert.equal(payload.summary.missingConfirmed, 0);
  assert.equal(payload.summary.categoryMismatches, 0);
  assert.ok(Array.isArray(payload.heldForIdentityReview));
});
