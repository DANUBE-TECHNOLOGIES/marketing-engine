"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MiniSiteSeoEnrichmentService,
  compensateAppliedWrites,
} = require("../src/modules/minisite-seo-enrichment/service");

test("compensation restaure les écritures réussies dans l'ordre inverse", async () => {
  const calls = [];
  const persistence = {
    async rollback(input) {
      calls.push(`${input.agencyId}:${input.pageSlug}:${input.versionId}`);
      return { version: input.versionId + 100, versionId: input.versionId + 1000 };
    },
  };

  const result = await compensateAppliedWrites([
    { persistence, agencyId: 1, slug: "home", rollbackVersionId: 11, appliedVersion: 12 },
    { persistence, agencyId: 1, slug: "agence", rollbackVersionId: 21, appliedVersion: 22 },
    { persistence, agencyId: 2, slug: "sejours", rollbackVersionId: 31, appliedVersion: 32 },
  ]);

  assert.deepEqual(calls, ["2:sejours:31", "1:agence:21", "1:home:11"]);
  assert.equal(result.compensated.length, 3);
  assert.equal(result.failures.length, 0);
});

test("compensation poursuit les autres restaurations si une page échoue", async () => {
  const calls = [];
  const persistence = {
    async rollback(input) {
      calls.push(input.pageSlug);
      if (input.pageSlug === "agence") {
        const error = new Error("rollback impossible");
        error.code = "ROLLBACK_TEST_FAILURE";
        throw error;
      }
      return { version: 99, versionId: 999 };
    },
  };

  const result = await compensateAppliedWrites([
    { persistence, agencyId: 1, slug: "home", rollbackVersionId: 11 },
    { persistence, agencyId: 1, slug: "agence", rollbackVersionId: 21 },
    { persistence, agencyId: 1, slug: "sejours", rollbackVersionId: 31 },
  ]);

  assert.deepEqual(calls, ["sejours", "agence", "home"]);
  assert.equal(result.compensated.length, 2);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].error, "ROLLBACK_TEST_FAILURE");
});

test("rollout réseau compense automatiquement les pages déjà écrites après un échec", async () => {
  const saveCalls = [];
  const rollbackCalls = [];
  let optimizedWriteCount = 0;
  const persistence = {
    async save(input) {
      saveCalls.push(input.pageSlug);
      optimizedWriteCount += 1;
      if (input.pageSlug === "circuits") {
        const error = new Error("écriture simulée impossible");
        error.code = "SIMULATED_WRITE_FAILURE";
        throw error;
      }
      return {
        id: `page-${input.pageSlug}`,
        slug: input.pageSlug,
        version: optimizedWriteCount + 10,
        versionId: optimizedWriteCount + 100,
      };
    },
    async rollback(input) {
      rollbackCalls.push(`${input.pageSlug}:${input.versionId}`);
      return {
        version: input.versionId + 100,
        versionId: input.versionId + 1000,
      };
    },
  };

  const service = new MiniSiteSeoEnrichmentService({
    repository: {},
    pageBuilderPersistenceService: persistence,
  });

  service.buildNetworkContentOptimization = async () => ({
    similarity: { blocked: false },
    quality: { blocked: false },
    sitemapReadiness: { blocked: false },
    summary: { pagesChanged: 3, rolloutBlocked: false },
    plans: [{
      agencyId: 42,
      siteSlug: "test-agency",
      pages: ["home", "agence", "circuits"].map((slug) => ({
        pageId: `old-${slug}`,
        slug,
        changed: true,
        changes: [{ field: "title" }],
        currentBlocks: [],
        optimizedBlocks: [{ type: "hero", props: { title: slug } }],
        page: {
          title: slug,
          slug,
          status: "PUBLISHED",
          seoTitle: "",
          metaDescription: "",
          published: true,
        },
      })),
    }],
  });

  const rollbackIds = { home: 1001, agence: 1002, circuits: 1003 };
  service.createRollbackSnapshot = async (_persistence, _agencyId, item) => ({
    version: rollbackIds[item.slug] - 900,
    versionId: rollbackIds[item.slug],
  });

  await assert.rejects(
    () => service.optimizeNetworkContent({ dryRun: false, confirm: true }),
    (error) => {
      assert.equal(error.code, "MINISITE_SEO_NETWORK_ROLLOUT_COMPENSATED");
      assert.equal(error.details.originalError.code, "SIMULATED_WRITE_FAILURE");
      assert.equal(error.details.pagesWrittenBeforeFailure, 2);
      assert.equal(error.details.compensatedCount, 2);
      assert.equal(error.details.compensationFailureCount, 0);
      return true;
    },
  );

  assert.deepEqual(saveCalls, ["home", "agence", "circuits"]);
  assert.deepEqual(rollbackCalls, ["agence:1002", "home:1001"]);
});

test("rollout réseau signale explicitement une compensation partielle", async () => {
  let writeCount = 0;
  const persistence = {
    async save(input) {
      writeCount += 1;
      if (input.pageSlug === "agence") throw new Error("write failed");
      return { id: "home", slug: "home", version: 2, versionId: 22 };
    },
    async rollback() {
      const error = new Error("rollback failed");
      error.code = "SIMULATED_ROLLBACK_FAILURE";
      throw error;
    },
  };
  const service = new MiniSiteSeoEnrichmentService({ repository: {}, pageBuilderPersistenceService: persistence });
  service.buildNetworkContentOptimization = async () => ({
    similarity: { blocked: false },
    quality: { blocked: false },
    sitemapReadiness: { blocked: false },
    summary: { rolloutBlocked: false },
    plans: [{
      agencyId: 42,
      siteSlug: "test-agency",
      pages: ["home", "agence"].map((slug) => ({
        pageId: slug,
        slug,
        changed: true,
        changes: [],
        currentBlocks: [],
        optimizedBlocks: [],
        page: { title: slug, slug, status: "PUBLISHED", published: true },
      })),
    }],
  });
  service.createRollbackSnapshot = async (_persistence, _agencyId, item) => ({ version: 1, versionId: item.slug === "home" ? 101 : 102 });

  await assert.rejects(
    () => service.optimizeNetworkContent({ dryRun: false, confirm: true }),
    (error) => {
      assert.equal(error.code, "MINISITE_SEO_NETWORK_ROLLOUT_COMPENSATION_FAILED");
      assert.equal(error.details.pagesWrittenBeforeFailure, 1);
      assert.equal(error.details.compensationFailureCount, 1);
      assert.equal(error.details.compensationFailures[0].error, "SIMULATED_ROLLBACK_FAILURE");
      return true;
    },
  );
});
