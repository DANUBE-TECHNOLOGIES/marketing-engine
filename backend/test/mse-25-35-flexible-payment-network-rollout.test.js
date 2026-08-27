"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  applyFlexiblePaymentNetworkRollout,
  buildFlexiblePaymentNetworkRolloutPreview,
} = require("../src/modules/flexible-payment-experience/network-rollout");

function site(id, status = "ready") {
  const enabled = status !== "disabled";
  const paymentPolicy = status === "unconfigured"
    ? undefined
    : {
        enabled,
        products: ["flight"],
        installmentCounts: [3],
        feeMode: "unspecified",
      };

  const blocks = status === "deployed"
    ? [{ id: `existing-${id}`, blockType: "flexible_payment" }]
    : [];

  return {
    id,
    slug: id,
    agencyId: id,
    paymentPolicy,
    pages: [
      {
        id: `home-${id}`,
        siteId: id,
        slug: "home",
        title: "Accueil",
        status: "published",
        published: true,
        blocks,
      },
    ],
  };
}

function createRepository(sites) {
  const pages = new Map();
  const blocks = [];
  const versions = [];

  for (const currentSite of sites) {
    for (const page of currentSite.pages) {
      pages.set(`${currentSite.id}:${page.slug}`, {
        ...page,
        blocks: [...(page.blocks || [])],
        versions: [],
      });
    }
  }

  const client = {
    agencySitePage: {
      async findFirst({ where }) {
        return pages.get(`${where.siteId}:${where.slug}`) || null;
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
      async findFirst() {
        return null;
      },
      async delete() {
        return null;
      },
    },
  };

  return {
    repository: {
      prisma: {
        $transaction: async (callback) => callback(client),
      },
    },
    state: { blocks, versions },
  };
}

test("network rollout preview is deterministic and contains only ready sites", () => {
  const sites = [site("gien"), site("maurepas", "disabled"), site("nevers", "deployed")];
  const first = buildFlexiblePaymentNetworkRolloutPreview(sites);
  const second = buildFlexiblePaymentNetworkRolloutPreview(sites);

  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(first.readOnly, true);
  assert.equal(first.writes, false);
  assert.deepEqual(first.eligible.map((item) => item.siteId), ["gien"]);
  assert.deepEqual(first.excluded.map((item) => item.status), ["disabled", "deployed"]);
});

test("network rollout refuses apply without explicit confirmation", async () => {
  const sites = [site("gien")];
  const preview = buildFlexiblePaymentNetworkRolloutPreview(sites);
  const { repository } = createRepository(sites);

  await assert.rejects(
    applyFlexiblePaymentNetworkRollout(repository, {
      sites,
      siteIds: ["gien"],
      previewFingerprint: preview.fingerprint,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_NETWORK_CONFIRM_REQUIRED"
  );
});

test("network rollout refuses stale preview", async () => {
  const sites = [site("gien")];
  const { repository } = createRepository(sites);

  await assert.rejects(
    applyFlexiblePaymentNetworkRollout(repository, {
      sites,
      siteIds: ["gien"],
      previewFingerprint: "stale",
      confirm: true,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_NETWORK_PREVIEW_STALE"
  );
});

test("network rollout requires explicit site selection", async () => {
  const sites = [site("gien")];
  const preview = buildFlexiblePaymentNetworkRolloutPreview(sites);
  const { repository } = createRepository(sites);

  await assert.rejects(
    applyFlexiblePaymentNetworkRollout(repository, {
      sites,
      siteIds: [],
      previewFingerprint: preview.fingerprint,
      confirm: true,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_NETWORK_SELECTION_REQUIRED"
  );
});

test("network rollout refuses a selected site that is not ready", async () => {
  const sites = [site("gien"), site("maurepas", "disabled")];
  const preview = buildFlexiblePaymentNetworkRolloutPreview(sites);
  const { repository } = createRepository(sites);

  await assert.rejects(
    applyFlexiblePaymentNetworkRollout(repository, {
      sites,
      siteIds: ["maurepas"],
      previewFingerprint: preview.fingerprint,
      confirm: true,
    }),
    (error) => error.code === "FLEXIBLE_PAYMENT_NETWORK_SITE_NOT_READY"
  );
});

test("confirmed network rollout reuses MSE-25.32 versioned apply per selected site", async () => {
  const sites = [site("gien"), site("maurepas")];
  const preview = buildFlexiblePaymentNetworkRolloutPreview(sites);
  const { repository, state } = createRepository(sites);

  const result = await applyFlexiblePaymentNetworkRollout(repository, {
    sites,
    siteIds: ["gien", "maurepas"],
    previewFingerprint: preview.fingerprint,
    confirm: true,
    createdBy: "network-rollout-test",
  });

  assert.equal(result.summary.selectedSites, 2);
  assert.equal(result.summary.appliedSites, 2);
  assert.equal(result.summary.appliedBlocks, 2);
  assert.equal(state.blocks.length, 2);
  assert.equal(state.versions.length, 2);
  assert.ok(state.versions.every((item) => item.createdBy === "network-rollout-test"));
});
