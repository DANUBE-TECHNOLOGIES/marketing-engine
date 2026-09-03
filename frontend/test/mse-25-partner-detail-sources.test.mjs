import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(here, "..");

test("publishable partners keep one category-aligned editorial source while known holds remain explicit", () => {
  const result = spawnSync(process.execPath, ["scripts/partner-detail-source-audit.mjs"], {
    cwd: frontendRoot,
    encoding: "utf8",
  });

  // The audit deliberately exits non-zero while a confirmed partner still has a
  // documented content hold. Parse its report first and assert the exact holds
  // instead of treating every known hold as an unexpected audit failure.
  assert.ok([0, 2].includes(result.status), result.stdout || result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.policy, "one-category-aligned-specialized-source-per-confirmed-partner");
  assert.equal(payload.summary.duplicateSources, 0);
  assert.equal(payload.summary.categoryMismatches, 0);

  const missingConfirmed = Array.isArray(payload.missingConfirmed)
    ? payload.missingConfirmed
    : [];
  assert.deepEqual(
    missingConfirmed.map((item) => item.id),
    ["ovoyages"],
    "Ôvoyages reste volontairement hors publication tant que sa fiche éditoriale spécialisée n'est pas complétée"
  );

  const heldForIdentityReview = Array.isArray(payload.heldForIdentityReview)
    ? payload.heldForIdentityReview
    : [];
  assert.deepEqual(
    heldForIdentityReview.map((item) => item.id),
    ["asiam"]
  );

  assert.equal(payload.summary.missingSources, 2);
  assert.equal(payload.summary.missingConfirmed, 1);
  assert.equal(payload.summary.heldForIdentityReview, 1);
});
