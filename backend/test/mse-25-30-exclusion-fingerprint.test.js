"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { installEditorialHardening } = require("../src/modules/minisite-seo-enrichment/editorial-hardening-patch");
const { installPlanFingerprintGuard } = require("../src/modules/minisite-seo-enrichment/plan-fingerprint-patch");

const EXCLUSION_ENV = "MSE_25_30_EXCLUDED_SITE_SLUGS";

function textBlock(text) {
  return { type: "rich_text", content: { text } };
}

function agencyPlan({ agencyId, siteSlug, city }) {
  return {
    agencyId,
    siteSlug,
    city,
    summary: { pagesProcessed: 1, pagesChanged: 0 },
    pages: [{
      slug: "home",
      title: "Accueil",
      published: true,
      changed: false,
      optimizedBlocks: [textBlock(`${siteSlug} ${city} contenu éditorial de contrôle suffisamment distinct pour le fingerprint du périmètre réseau`)],
      changes: [],
    }],
  };
}

function rawNetworkPlan() {
  return {
    version: "mse-25.30",
    plans: [
      agencyPlan({ agencyId: 8, siteSlug: "tui-store-melun", city: "Melun" }),
      agencyPlan({ agencyId: 9, siteSlug: "tui-store-amilly", city: "Amilly" }),
    ],
    similarity: {},
    quality: {},
    sitemapReadiness: {
      sites: [
        { siteSlug: "tui-store-melun", readyToSubmit: true },
        { siteSlug: "tui-store-amilly", readyToSubmit: true },
      ],
      notReady: [],
      notReadyCount: 0,
      blocked: false,
    },
    summary: {},
  };
}

function fakeServiceClass(onWrite) {
  return class FakeService {
    health() { return { status: "ok" }; }

    async buildAgencyContentOptimization() {
      return { pages: [], summary: {} };
    }

    async buildNetworkContentOptimization() {
      return rawNetworkPlan();
    }

    async optimizeNetworkContent(options = {}) {
      const plan = await this.buildNetworkContentOptimization(options);
      onWrite();
      return { ...plan, writes: true };
    }
  };
}

function restoreEnv(previous) {
  if (previous === undefined) delete process.env[EXCLUSION_ENV];
  else process.env[EXCLUSION_ENV] = previous;
}

test("MSE-25.30 le fingerprint refuse un changement du périmètre d'exclusion entre preview et apply", async () => {
  let writes = 0;
  const previous = process.env[EXCLUSION_ENV];
  delete process.env[EXCLUSION_ENV];

  try {
    const FakeService = fakeServiceClass(() => { writes += 1; });
    installEditorialHardening(FakeService);
    installPlanFingerprintGuard(FakeService);

    const service = new FakeService();
    const preview = await service.buildNetworkContentOptimization();

    assert.deepEqual(preview.plans.map((plan) => plan.siteSlug), ["tui-store-amilly"]);
    assert.deepEqual(preview.excludedSiteSlugs, ["tui-store-melun"]);
    assert.match(preview.planFingerprint, /^[a-f0-9]{64}$/);

    process.env[EXCLUSION_ENV] = "";

    await assert.rejects(
      () => service.optimizeNetworkContent({
        expectedPlanFingerprint: preview.planFingerprint,
      }),
      (error) => {
        assert.equal(error?.code, "MINISITE_SEO_NETWORK_APPROVED_PLAN_MISMATCH");
        assert.equal(error?.status, 409);
        assert.equal(error?.details?.expectedPlanFingerprint, preview.planFingerprint);
        assert.match(error?.details?.actualPlanFingerprint || "", /^[a-f0-9]{64}$/);
        return true;
      }
    );

    assert.equal(writes, 0);
  } finally {
    restoreEnv(previous);
  }
});

test("MSE-25.30 autorise l'apply lorsque le périmètre d'exclusion est resté identique", async () => {
  let writes = 0;
  const previous = process.env[EXCLUSION_ENV];
  delete process.env[EXCLUSION_ENV];

  try {
    const FakeService = fakeServiceClass(() => { writes += 1; });
    installEditorialHardening(FakeService);
    installPlanFingerprintGuard(FakeService);

    const service = new FakeService();
    const preview = await service.buildNetworkContentOptimization();
    const applied = await service.optimizeNetworkContent({
      expectedPlanFingerprint: preview.planFingerprint,
    });

    assert.equal(writes, 1);
    assert.equal(applied.writes, true);
    assert.equal(applied.planFingerprint, preview.planFingerprint);
    assert.deepEqual(applied.plans.map((plan) => plan.siteSlug), ["tui-store-amilly"]);
    assert.deepEqual(applied.excludedSiteSlugs, ["tui-store-melun"]);
  } finally {
    restoreEnv(previous);
  }
});
