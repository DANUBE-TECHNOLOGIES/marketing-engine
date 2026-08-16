"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertRollbackManifestIntegrity,
  auditRollbackManifest,
  expectedRollbackEntries,
  normalizePageSlug,
} = require("../src/modules/minisite-seo-enrichment/network-rollback-audit");

function validReport() {
  return {
    type: "mse-25.30-network-rollout-report",
    result: {
      agencies: [{
        agencyId: 9,
        siteSlug: "tui-store-amilly",
        pages: [
          { slug: "home", changed: true, rollbackVersionId: 101 },
          { slug: "services", changed: true, rollbackVersionId: 102 },
          { slug: "contact", changed: false, rollbackVersionId: null },
        ],
      }],
    },
    rollbackManifest: [
      { agencyId: 9, siteSlug: "tui-store-amilly", slug: "home", rollbackVersionId: 101 },
      { agencyId: 9, siteSlug: "tui-store-amilly", slug: "services", rollbackVersionId: 102 },
    ],
  };
}

test("MSE-25.30 normalise les slugs home pour l'audit de rollback", () => {
  assert.equal(normalizePageSlug("home"), "");
  assert.equal(normalizePageSlug("ACCUEIL"), "");
  assert.equal(normalizePageSlug("/services/"), "services");
});

test("MSE-25.30 construit les attentes de rollback uniquement depuis les pages réellement modifiées", () => {
  assert.deepEqual(expectedRollbackEntries(validReport()), [
    { agencyId: 9, siteSlug: "tui-store-amilly", slug: "", rollbackVersionId: 101 },
    { agencyId: 9, siteSlug: "tui-store-amilly", slug: "services", rollbackVersionId: 102 },
  ]);
});

test("MSE-25.30 accepte un manifeste exactement aligné sur le rollout", () => {
  const audit = assertRollbackManifestIntegrity(validReport());
  assert.equal(audit.ok, true);
  assert.equal(audit.expectedCount, 2);
  assert.equal(audit.manifestCount, 2);
  assert.deepEqual(audit.unexpected, []);
  assert.deepEqual(audit.missing, []);
});

test("MSE-25.30 refuse une restauration ajoutée au manifeste après le rollout", () => {
  const report = validReport();
  report.rollbackManifest.push({
    agencyId: 8,
    siteSlug: "tui-store-melun",
    slug: "home",
    rollbackVersionId: 999,
  });

  assert.throws(() => assertRollbackManifestIntegrity(report), (error) => {
    assert.equal(error.code, "MSE_25_30_NETWORK_ROLLBACK_MANIFEST_MISMATCH");
    assert.equal(error.details.unexpected.length, 1);
    assert.equal(error.details.unexpected[0].siteSlug, "tui-store-melun");
    return true;
  });
});

test("MSE-25.30 refuse une page attendue supprimée du manifeste", () => {
  const report = validReport();
  report.rollbackManifest.pop();
  const audit = auditRollbackManifest(report);

  assert.equal(audit.ok, false);
  assert.equal(audit.missing.length, 1);
  assert.equal(audit.missing[0].slug, "services");
});

test("MSE-25.30 refuse une entrée de rollback dupliquée", () => {
  const report = validReport();
  report.rollbackManifest.push({ ...report.rollbackManifest[0] });

  const audit = auditRollbackManifest(report);
  assert.equal(audit.ok, false);
  assert.equal(audit.duplicateKeys.length, 1);
});
