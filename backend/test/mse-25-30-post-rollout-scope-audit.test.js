"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  assertApprovedScopeAudit,
  normalizedSlugs,
  persistValidationScopeAudit,
} = require("../src/modules/minisite-seo-enrichment/post-rollout-audit");

test("MSE-25.30 normalise les slugs de preuve avant comparaison", () => {
  assert.deepEqual(normalizedSlugs([
    "TUI-STORE-MELUN",
    "tui-store-melun",
    "  TUI-STORE-AMILLY  ",
  ]), ["tui-store-amilly", "tui-store-melun"]);
});

test("MSE-25.30 refuse un ancien rapport sans preuve approvedScopeAudit", () => {
  assert.throws(() => assertApprovedScopeAudit({
    result: {
      ok: true,
      writes: true,
      agencies: [{ agencyId: 9, siteSlug: "tui-store-amilly" }],
    },
  }), (error) => error.code === "MSE_25_30_POST_ROLLOUT_APPROVED_SCOPE_AUDIT_REQUIRED");
});

test("MSE-25.30 refuse une preuve dont les exclusions diffèrent du périmètre approuvé", () => {
  assert.throws(() => assertApprovedScopeAudit({
    approvedScope: { excludedSiteSlugs: ["tui-store-melun"] },
    approvedScopeAudit: {
      ok: true,
      excludedSiteSlugs: ["tui-store-amilly"],
    },
    result: { agencies: [] },
    rollbackManifest: [],
  }), (error) => error.code === "MSE_25_30_POST_ROLLOUT_APPROVED_SCOPE_AUDIT_MISMATCH");
});

test("MSE-25.30 recalcule la preuve et refuse une agence exclue réapparue dans le rapport", () => {
  assert.throws(() => assertApprovedScopeAudit({
    approvedScope: { excludedSiteSlugs: ["tui-store-melun"] },
    approvedScopeAudit: {
      ok: true,
      excludedSiteSlugs: ["tui-store-melun"],
      violations: [],
    },
    result: {
      agencies: [{ agencyId: 8, siteSlug: "tui-store-melun" }],
    },
    rollbackManifest: [],
  }), (error) => error.code === "MSE_25_30_ROLLOUT_EXCLUDED_SCOPE_VIOLATION");
});

test("MSE-25.30 accepte une chaîne de preuve cohérente", () => {
  const audit = assertApprovedScopeAudit({
    approvedScope: { excludedSiteSlugs: ["tui-store-melun"] },
    approvedScopeAudit: {
      ok: true,
      excludedSiteSlugs: ["tui-store-melun"],
      violations: [],
    },
    result: {
      agencies: [{ agencyId: 9, siteSlug: "tui-store-amilly" }],
    },
    rollbackManifest: [{ agencyId: 9, siteSlug: "tui-store-amilly", slug: "home" }],
  });

  assert.deepEqual(audit, {
    ok: true,
    excludedSiteSlugs: ["tui-store-melun"],
    appliedAgencyCount: 1,
    rollbackManifestCount: 1,
    violations: [],
  });
});

test("MSE-25.30 persiste la preuve d'exclusion dans le rapport post-rollout final", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-30-post-scope-"));
  const reportPath = path.join(dir, "post-rollout.json");
  const approvedScope = {
    excludedSiteSlugs: ["tui-store-melun"],
    excludedAgencies: [{ agencyId: 8, siteSlug: "tui-store-melun", city: "Melun" }],
  };
  const approvedScopeAudit = {
    ok: true,
    excludedSiteSlugs: ["tui-store-melun"],
    appliedAgencyCount: 1,
    rollbackManifestCount: 1,
    violations: [],
  };

  fs.writeFileSync(reportPath, JSON.stringify({
    type: "mse-25.30-post-rollout-validation",
    ok: true,
    summary: { agenciesChecked: 1 },
  }), "utf8");

  try {
    const persisted = persistValidationScopeAudit({
      postRolloutReportPath: reportPath,
      rolloutReport: { approvedScope },
      approvedScopeAudit,
    });
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

    assert.deepEqual(persisted.approvedScope, approvedScope);
    assert.deepEqual(report.approvedScope, approvedScope);
    assert.deepEqual(report.approvedScopeAudit, approvedScopeAudit);
    assert.equal(report.ok, true);
    assert.equal(report.summary.agenciesChecked, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
