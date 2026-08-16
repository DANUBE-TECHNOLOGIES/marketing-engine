"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { installEditorialHardening } = require("../src/modules/minisite-seo-enrichment/editorial-hardening-patch");
const { installPlanFingerprintGuard } = require("../src/modules/minisite-seo-enrichment/plan-fingerprint-patch");

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
      optimizedBlocks: [textBlock(`${siteSlug} ${city} contenu éditorial de contrôle suffisamment distinct pour le fingerprint du périmètre réseau`) ],
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

test("MSE-25.30 le fingerprint verrouille aussi le périmètre des agences exclues", async () => {
  let writes = 0;

  class FakeService {
    health() { return { status: "ok" }; }

    async buildAgencyContentOptimization() {
      return { pages: [], summary: {} };
    }

    async buildNetworkContentOptimization() {
      return rawNetworkPlan();
    }

    async optimizeNetworkContent(options = {}) {
      const plan = await this.buildNetworkContentOptimization(options);
      writes += 1;
      return { ...plan, writes: true };
    }
  }

  installEditorialHardening(FakeService);
  installPlanFingerprintGuard(FakeService);

  const service = new FakeService();
  const preview = await service.buildNetworkContentOptimization({
    excludedSiteSlugs: ["tui-store-melun"],
  });

  assert.deepEqual(preview.plans.map((plan) => plan.siteSlug), ["tui-store-amilly"]);
  assert.match(preview.planFingerprint, /^[a-f0-9]{64}$/);

  await assert.rejects(
    () => service.optimizeNetworkContent({
      excludedSiteSlugs: [],
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
});

test("MSE-25.30 autorise le même périmètre exclu avec le fingerprint approuvé", async () => {
  let writes = 0;

  class FakeService {
    async buildAgencyContentOptimization() {
      return { pages: [], summary: {} };
    }

    async buildNetworkContentOptimization() {
      return rawNetworkPlan();
    }

    async optimizeNetworkContent(options = {}) {
      const plan = await this.buildNetworkContentOptimization(options);
      writes += 1;
      return { ...plan, writes: true };
    }
  }

  installEditorialHardening(FakeService);
  installPlanFingerprintGuard(FakeService);

  const service = new FakeService();
  const preview = await service.buildNetworkContentOptimization({
    excludedSiteSlugs: ["tui-store-melun"],
  });

  const applied = await service.optimizeNetworkContent({
    excludedSiteSlugs: ["tui-store-melun"],
    expectedPlanFingerprint: preview.planFingerprint,
  });

  assert.equal(writes, 1);
  assert.equal(applied.writes, true);
  assert.equal(applied.planFingerprint, preview.planFingerprint);
  assert.deepEqual(applied.plans.map((plan) => plan.siteSlug), ["tui-store-amilly"]);
});
