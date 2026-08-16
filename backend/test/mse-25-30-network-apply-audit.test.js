"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  approvedScopeFromPreflight,
  persistApprovedScope,
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

test("MSE-25.30 inscrit le périmètre approuvé dans le rapport de rollout", () => {
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
    },
  }), "utf8");

  try {
    const persisted = persistApprovedScope({
      rolloutReportPath: rolloutPath,
      preflightReportPath: preflightPath,
    });
    const report = JSON.parse(fs.readFileSync(rolloutPath, "utf8"));

    assert.deepEqual(persisted.approvedScope.excludedSiteSlugs, ["tui-store-melun"]);
    assert.deepEqual(report.approvedScope, persisted.approvedScope);
    assert.deepEqual(report.result.approvedScope, persisted.approvedScope);
    assert.deepEqual(report.result.agencies.map((agency) => agency.siteSlug), ["tui-store-amilly"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
