"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  installPlanFingerprintGuard,
  normalizeParameters,
  planFingerprint,
} = require("../src/modules/minisite-seo-enrichment/plan-fingerprint-patch");

function networkPlan({ title = "Circuits à Gien", reverse = false } = {}) {
  const pages = [
    {
      slug: "circuits",
      title: "Circuits",
      published: true,
      changed: true,
      changes: [
        {
          blockId: 12,
          blockType: "hero",
          field: "title",
          previous: "Circuits",
          next: title,
          generated: false,
          purpose: "local-seo-h1",
        },
      ],
    },
    {
      slug: "contact",
      title: "Contact",
      published: true,
      changed: false,
      changes: [],
    },
  ];

  const plans = [
    {
      agencyId: 1,
      siteSlug: "gien",
      targetCities: reverse ? ["Montargis", "Gien"] : ["Gien", "Montargis"],
      excludedPages: reverse
        ? [
            { slug: "inspiration", reason: "canonical-route-managed" },
            { slug: "mentions-legales", reason: "noindex-page" },
          ]
        : [
            { slug: "mentions-legales", reason: "noindex-page" },
            { slug: "inspiration", reason: "canonical-route-managed" },
          ],
      pages: reverse ? [...pages].reverse() : pages,
    },
    {
      agencyId: 2,
      siteSlug: "maurepas",
      targetCities: ["Maurepas"],
      excludedPages: [],
      pages: [],
    },
  ];

  return {
    version: "mse-25.30",
    plans: reverse ? [...plans].reverse() : plans,
    summary: { agenciesProcessed: 2 },
  };
}

test("MSE-25.30 plan fingerprint est déterministe malgré l'ordre des tableaux", () => {
  const parameters = {
    similarityThreshold: 0.78,
    minimumWords: 80,
    qualityMinimumWords: 120,
  };

  assert.equal(
    planFingerprint(networkPlan(), parameters),
    planFingerprint(networkPlan({ reverse: true }), parameters)
  );
});

test("MSE-25.30 plan fingerprint change avec le diff réel ou les paramètres approuvés", () => {
  const parameters = normalizeParameters({});
  const baseline = planFingerprint(networkPlan(), parameters);

  assert.notEqual(
    baseline,
    planFingerprint(networkPlan({ title: "Circuits et voyages organisés à Gien" }), parameters)
  );
  assert.notEqual(
    baseline,
    planFingerprint(networkPlan(), { ...parameters, minimumWords: parameters.minimumWords + 1 })
  );
});

test("MSE-25.30 refuse un plan recalculé différent avant la première écriture", async () => {
  let writes = 0;
  let currentPlan = networkPlan();

  class FakeSeoService {
    health() {
      return { status: "ok" };
    }

    async buildNetworkContentOptimization() {
      return currentPlan;
    }

    async optimizeNetworkContent(options = {}) {
      const plan = await this.buildNetworkContentOptimization(options);
      writes += 1;
      return {
        ...plan,
        writes: true,
      };
    }
  }

  installPlanFingerprintGuard(FakeSeoService);
  const service = new FakeSeoService();
  const options = normalizeParameters({});
  const approved = planFingerprint(currentPlan, options);

  currentPlan = networkPlan({ title: "Circuits et voyages organisés à Gien" });

  await assert.rejects(
    () => service.optimizeNetworkContent({
      ...options,
      expectedPlanFingerprint: approved,
    }),
    (error) => {
      assert.equal(error?.code, "MINISITE_SEO_NETWORK_APPROVED_PLAN_MISMATCH");
      assert.equal(error?.status, 409);
      assert.equal(error?.details?.expectedPlanFingerprint, approved);
      assert.match(error?.details?.actualPlanFingerprint || "", /^[a-f0-9]{64}$/);
      return true;
    }
  );

  assert.equal(writes, 0);
  assert.equal(service.health().approvedPlanFingerprintGuard, true);
});

test("MSE-25.30 autorise l'apply lorsque le plan recalculé correspond exactement au preview", async () => {
  let writes = 0;
  const currentPlan = networkPlan();

  class FakeSeoService {
    async buildNetworkContentOptimization() {
      return currentPlan;
    }

    async optimizeNetworkContent(options = {}) {
      const plan = await this.buildNetworkContentOptimization(options);
      writes += 1;
      return {
        ...plan,
        writes: true,
      };
    }
  }

  installPlanFingerprintGuard(FakeSeoService);
  const service = new FakeSeoService();
  const options = normalizeParameters({});
  const approved = planFingerprint(currentPlan, options);

  const result = await service.optimizeNetworkContent({
    ...options,
    expectedPlanFingerprint: approved,
  });

  assert.equal(writes, 1);
  assert.equal(result.writes, true);
  assert.equal(result.approvedPlanFingerprint, approved);
  assert.deepEqual(result.parameters, options);
  assert.equal(result.planFingerprint, approved);
});
