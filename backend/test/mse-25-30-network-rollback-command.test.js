"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { loadManifest, requireConfirmation } = require("../scripts/mse-25-30-network-rollback");

test("MSE-25.30 network rollback requires explicit operator confirmation", () => {
  assert.throws(
    () => requireConfirmation("NO"),
    (error) => {
      assert.equal(error.code, "MSE_25_30_NETWORK_ROLLBACK_OPERATOR_CONFIRMATION_REQUIRED");
      return true;
    }
  );
  assert.doesNotThrow(() => requireConfirmation("YES"));
});

test("MSE-25.30 network rollback loads exact version targets from apply manifest", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-30-rollback-"));
  const file = path.join(dir, "manifest.json");
  fs.writeFileSync(file, JSON.stringify({ rollbackManifest: [
    { agencyId: 1, siteSlug: "gien", slug: "circuits", rollbackVersionId: 123 },
    { agencyId: 2, siteSlug: "nevers", slug: "", rollbackVersionId: 456 },
  ] }));

  const manifest = loadManifest(file);
  assert.equal(manifest.length, 2);
  assert.deepEqual(manifest[0], { agencyId: 1, siteSlug: "gien", slug: "circuits", rollbackVersionId: 123 });
  assert.deepEqual(manifest[1], { agencyId: 2, siteSlug: "nevers", slug: "", rollbackVersionId: 456 });
});

test("MSE-25.30 network rollback rejects incomplete manifest entries", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-30-rollback-invalid-"));
  const file = path.join(dir, "manifest.json");
  fs.writeFileSync(file, JSON.stringify({ rollbackManifest: [{ agencyId: 1, slug: "circuits" }] }));

  assert.throws(
    () => loadManifest(file),
    (error) => {
      assert.equal(error.code, "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_INVALID");
      return true;
    }
  );
});
