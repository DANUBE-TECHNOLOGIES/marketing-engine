"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyPaymentPlacementPreview,
  buildPaymentPlacementPreview,
  resolveAgencyPaymentPolicy,
  rollbackPaymentPlacement,
} = require("../src/modules/flexible-payment-experience");

function publishedSite() {
  return {
    id: "site-1",
    slug: "gien",
    paymentPolicy: {
      enabled: true,
      products: ["flight"],
      installmentCounts: [3, 4],
      feeMode: "without-fees",
    },
    pages: [
      { id: "home-1", slug: "home", status: "published", published: true, blocks: [] },
      { id: "flight-1", slug: "billetterie-et-vols", status: "published", published: true, blocks: [] },
    ],
  };
}

function createRepository() {
  const pages = new Map([
    ["home", {
      id: "home-1",
      siteId: "site-1",
      slug: "home",
      title: "Accueil",
      status: "published",
      published: true,
      blocks: [],
      versions: [],
    }],
    ["billetterie-et-vols", {
      id: "flight-1",
      siteId: "site-1",
      slug: "billetterie-et-vols",
      title: "Billetterie et vols",
      status: "published",
      published: true,
      blocks: [],
      versions: [],
    }],
  ]);
  const versions = [];
  const blocks = [];

  const client = {
    agencySitePage: {
      async findFirst({ where }) {
        return pages.get(where.slug) || null;
      },
    },
    agencySitePageVersion: {
      async create({ data }) {
        versions.push(data);
        const page = [...pages.values()].find((candidate) => candidate.id === data.pageId);
        page.versions = [{ version: data.version }];
        return { id: `version-${versions.length}`, ...data };
      },
    },
    pageBlock: {
      async create({ data }) {
        const created = { id: `block-${blocks.length + 1}`, ...data };
        blocks.push(created);
        const page = [...pages.values()].find((candidate) => candidate.id === data.pageId);
        page.blocks.push(created);
        return created;
      },
      async findFirst({ where }) {
        return blocks.find((block) => block.id === where.id && block.pageId === where.pageId) || null;
      },
      async delete({ where }) {
        const index = blocks.findIndex((block) => block.id === where.id);
        const [deleted] = index >= 0 ? blocks.splice(index, 1) : [null];
        if (deleted) {
          const page = [...pages.values()].find((candidate) => candidate.id === deleted.pageId);
          page.blocks = page.blocks.filter((block) => block.id !== deleted.id);
        }
        return deleted;
      },
    },
  };

  return {
    repository: {
      prisma: {
        $transaction: async (callback) => callback(client),
      },
    },
    state: { pages, versions, blocks },
  };
}

test("agency policy is resolved from AgencySite data when no override is supplied", () => {
  const policy = resolveAgencyPaymentPolicy(publishedSite());
  assert.equal(policy.enabled, true);
  assert.deepEqual(policy.products, ["flight"]);
  assert.deepEqual(policy.installmentCounts, [3, 4]);
  assert.equal(policy.feeMode, "without-fees");
});

test("preview is deterministic and fingerprinted", () => {
  const site = publishedSite();
  const first = buildPaymentPlacementPreview({ site });
  const second = buildPaymentPlacementPreview({ site });

  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.readOnly, true);
  assert.equal(first.writes, false);
  assert.equal(first.proposals.length, 2);
});

test("apply refuses writes without explicit confirmation", async () => {
  const site = publishedSite();
  const preview = buildPaymentPlacementPreview({ site });
  const { repository } = createRepository();

  await assert.rejects(
    applyPaymentPlacementPreview(repository, {
      site,
      previewFingerprint: preview.fingerprint,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_CONFIRM_REQUIRED"
  );
});

test("apply refuses a stale fingerprint", async () => {
  const site = publishedSite();
  const { repository } = createRepository();

  await assert.rejects(
    applyPaymentPlacementPreview(repository, {
      site,
      previewFingerprint: "stale",
      confirm: true,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_PREVIEW_STALE"
  );
});

test("confirmed apply versions pages and creates Website Designer V2 blocks", async () => {
  const site = publishedSite();
  const preview = buildPaymentPlacementPreview({ site });
  const { repository, state } = createRepository();

  const result = await applyPaymentPlacementPreview(repository, {
    site,
    previewFingerprint: preview.fingerprint,
    confirm: true,
    createdBy: "test-user",
  });

  assert.equal(result.summary.proposed, 2);
  assert.equal(result.summary.applied, 2);
  assert.equal(state.versions.length, 2);
  assert.equal(state.blocks.length, 2);
  assert.ok(state.versions.every((version) => version.createdBy === "test-user"));
  assert.ok(state.blocks.every((block) => block.blockType === "flexible_payment"));
  assert.ok(state.blocks.every((block) => block.status === "published"));
  assert.ok(state.blocks.every((block) => block.seo.source === "mse-25.32"));
  assert.match(state.blocks[0].content.body, /3x ou 4x sans frais/);
});

test("apply is idempotent when a generated block is already present at write time", async () => {
  const site = publishedSite();
  const preview = buildPaymentPlacementPreview({ site });
  const { repository, state } = createRepository();

  await applyPaymentPlacementPreview(repository, {
    site,
    previewFingerprint: preview.fingerprint,
    confirm: true,
  });

  const second = await applyPaymentPlacementPreview(repository, {
    site,
    previewFingerprint: preview.fingerprint,
    confirm: true,
  });

  assert.equal(second.summary.applied, 0);
  assert.equal(state.blocks.length, 2);
  assert.ok(second.skipped.every((item) => item.reason === "flexible-payment-block-already-present-at-apply"));
});

test("rollback deletes only a block owned by MSE-25.32", async () => {
  const site = publishedSite();
  const preview = buildPaymentPlacementPreview({ site });
  const { repository, state } = createRepository();

  const applied = await applyPaymentPlacementPreview(repository, {
    site,
    previewFingerprint: preview.fingerprint,
    confirm: true,
  });

  const target = applied.applied[0];
  const rollback = await rollbackPaymentPlacement(repository, {
    pageId: target.pageId,
    blockId: target.blockId,
    confirm: true,
  });

  assert.equal(rollback.rolledBack, true);
  assert.equal(state.blocks.length, 1);
});
