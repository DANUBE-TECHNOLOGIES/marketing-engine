"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { MiniSiteSeoEnrichmentService } = require("../src/modules/minisite-seo-enrichment/service");

test("MSE-25.30 creates an exact rollback snapshot before network page writes", async () => {
  const calls = [];
  const persistence = {
    async save(input) {
      calls.push(input);
      return { id: 10, slug: "circuits", version: 7 };
    },
    async versions() {
      return {
        pageId: 10,
        items: [
          { id: 707, version: 7, reason: "mse-25.30-network-pre-rollout-snapshot" },
          { id: 606, version: 6, reason: "manual-save" },
        ],
      };
    },
  };
  const service = new MiniSiteSeoEnrichmentService({ repository: {}, pageBuilderPersistenceService: persistence });
  const item = {
    slug: "circuits",
    page: {
      title: "Circuits à Gien",
      slug: "circuits",
      status: "published",
      seoTitle: "Circuits à Gien",
      metaDescription: "Conseils circuits à Gien",
      published: true,
    },
    currentBlocks: [{ type: "hero", status: "published", position: 0, content: { title: "Circuits à Gien" } }],
  };

  const snapshot = await service.createRollbackSnapshot(persistence, 42, item, "test-runner");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].agencyId, 42);
  assert.equal(calls[0].metadata.reason, "mse-25.30-network-pre-rollout-snapshot");
  assert.deepEqual(calls[0].body.blocks, item.currentBlocks);
  assert.equal(snapshot.version, 7);
  assert.equal(snapshot.versionId, 707);
});
