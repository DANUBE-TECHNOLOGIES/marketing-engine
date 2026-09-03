"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  approvedScopeFromPreflight,
  assertExcludedScopeRespected,
  excludedScopeAudit,
  persistApprovedScope,
  persistRolloutReportIntegrity,
} = require("../src/modules/minisite-seo-enrichment/network-apply-audit");

test("MSE-25.30 normalise le périmètre d'exclusion approuvé par le preflight", () => {
  const scope = approvedScopeFromPreflight({
    preview: {
      excludedSiteSlugs: ["TUI-STORE-MELUN", "tui-store-melun"],
      excludedAgencies: [
        { agencyId: 8, siteSlug: "TUI-STORE-MELUN", city: "Melun" },
      ],
    },
  });

  assert.deepEqual(scope, {
    excludedSiteSlugs: ["tui-store-melun"],
    excludedAgencies: [
      { agencyId: 8, siteSlug: "tui-store-melun", city: "Melun" },
    ],
  });
});

test("MSE-25.30 prouve que les agences exclues sont absentes des écritures et du rollback", () => {
  const approvedScope = { excludedSiteSlugs: ["tui-store-melun"] };
  const audit = excludedScopeAudit({
    result: {
      agencies: [{ agencyId: 9, siteSlug: "tui-store-amilly" }],
      rollbackManifest: [{ agencyId: 9, siteSlug: "tui-store-amilly", slug: "home" }],
    },
  }, approvedScope);

  assert.equal(audit.ok, true);
  assert.equal(audit.appliedAgencyCount, 1);
  assert.equal(audit.rollbackManifestCount, 1);
  assert.deepEqual(audit.violations, []);
});

test("MSE-25.30 refuse de certifier un rollout qui a écrit une agence exclue", () => {
  const approvedScope = { excludedSiteSlugs: ["tui-store-melun"] };

  assert.throws(() => assertExcludedScopeRespected({
    result: {
      agencies: [{ agencyId: 8, siteSlug: "TUI-STORE-MELUN" }],
    },
    rollbackManifest: [{ agencyId: 8, siteSlug: "tui-store-melun", slug: "home" }],
  }, approvedScope), (error) => {
    assert.equal(error.code, "MSE_25_30_ROLLOUT_EXCLUDED_SCOPE_VIOLATION");
    assert.equal(error.details.ok, false);
    assert.deepEqual(error.details.violations.map((item) => item.source).sort(), [
      "result.agencies",
      "rollbackManifest",
    ]);
    return true;
  });
});

test("MSE-25.30 inscrit le périmètre approuvé et son audit dans le rapport de rollout", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-30-apply-audit-"));
  const preflightPath = path.join(dir, "preflight.json");
  const rolloutPath = path.join(dir, "rollout.json");

  fs.writeFileSync(preflightPath, JSON.stringify({
    preview: {
      excludedSiteSlugs: ["tui-store-melun"],
      excludedAgencies: [
        { agencyId: 8, siteSlug: "tui-store-melun", city: "Melun" },
      ],
    },
  }), "utf8");
  fs.writeFileSync(rolloutPath, JSON.stringify({
    type: "mse-25.30-network-rollout-report",
    result: {
      ok: true,
      writes: true,
      agencies: [{ agencyId: 9, siteSlug: "tui-store-amilly" }],
      rollbackManifest: [{ agencyId: 9, siteSlug: "tui-store-amilly", slug: "home" }],
    },
  }), "utf8");

  try {
    const persisted = persistApprovedScope({
      rolloutReportPath: rolloutPath,
      preflightReportPath: preflightPath,
    });
    const report = JSON.parse(fs.readFileSync(rolloutPath, "utf8"));

    assert.deepEqual(persisted.approvedScope.excludedSiteSlugs, ["tui-store-melun"]);
    assert.equal(persisted.approvedScopeAudit.ok, true);
    assert.deepEqual(report.approvedScope, persisted.approvedScope);
    assert.deepEqual(report.approvedScopeAudit, persisted.approvedScopeAudit);
    assert.deepEqual(report.result.approvedScope, persisted.approvedScope);
    assert.deepEqual(report.result.approvedScopeAudit, persisted.approvedScopeAudit);
    assert.deepEqual(report.result.agencies.map((agency) => agency.siteSlug), ["tui-store-amilly"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("MSE-25.30 n'enrichit pas un rapport contradictoire avec un faux périmètre approuvé", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-30-apply-audit-violation-"));
  const preflightPath = path.join(dir, "preflight.json");
  const rolloutPath = path.join(dir, "rollout.json");

  fs.writeFileSync(preflightPath, JSON.stringify({
    preview: {
      excludedSiteSlugs: ["tui-store-melun"],
      excludedAgencies: [{ agencyId: 8, siteSlug: "tui-store-melun", city: "Melun" }],
    },
  }), "utf8");
  fs.writeFileSync(rolloutPath, JSON.stringify({
    type: "mse-25.30-network-rollout-report",
    result: {
      ok: true,
      writes: true,
      agencies: [{ agencyId: 8, siteSlug: "tui-store-melun" }],
    },
  }), "utf8");

  try {
    assert.throws(() => persistApprovedScope({
      rolloutReportPath: rolloutPath,
      preflightReportPath: preflightPath,
    }), (error) => error.code === "MSE_25_30_ROLLOUT_EXCLUDED_SCOPE_VIOLATION");

    const report = JSON.parse(fs.readFileSync(rolloutPath, "utf8"));
    assert.equal(report.approvedScope, undefined);
    assert.equal(report.approvedScopeAudit, undefined);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("MSE-25.30 certifie et persiste l'intégrité du rapport immédiatement après apply", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mse-25-30-apply-integrity-"));
  const rolloutPath = path.join(dir, "rollout.json");
  const fingerprint = "a".repeat(64);
  const parameters = { similarityThreshold: 0.82, minimumWords: 40, qualityMinimumWords: 60 };

  fs.writeFileSync(rolloutPath, JSON.stringify({
    type: "mse-25.30-network-rollout-report",
    repository: { head: "abc123" },
    preflight: { repositoryHead: "abc123", planFingerprint: fingerprint, parameters },
    result: {
      ok: true,
      writes: true,
      approvedPlanFingerprint: fingerprint,
      parameters: { ...parameters },
      preflight: { repositoryHead: "abc123", planFingerprint: fingerprint, parameters: { ...parameters } },
    },
  }), "utf8");

  try {
    const persisted = persistRolloutReportIntegrity(rolloutPath);
    const report = JSON.parse(fs.readFileSync(rolloutPath, "utf8"));

    assert.equal(persisted.rolloutReportIntegrity.ok, true);
    assert.deepEqual(report.rolloutReportIntegrity, persisted.rolloutReportIntegrity);
    assert.deepEqual(report.result.rolloutReportIntegrity, persisted.rolloutReportIntegrity);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
