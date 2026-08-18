"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyFlexiblePaymentNetworkRollback,
  verifyRollbackPlan,
} = require("../src/modules/flexible-payment-experience/network-rollback");
const {
  buildFlexiblePaymentRollbackPlan,
  buildFlexiblePaymentRolloutReceipt,
} = require("../src/modules/flexible-payment-experience/rollout-audit");

function fixture() {
  const rollout = {
    version: "mse-25.35",
    fingerprint: "network-fingerprint",
    selected: 1,
    applied: [{
      siteId: "site-1",
      slug: "gien",
      agencyId: "agency-1",
      result: {
        applied: [{
          pageId: "page-1",
          blockId: "block-1",
          placement: "compact",
          rollbackVersion: 4,
        }],
      },
    }],
  };
  const receipt = buildFlexiblePaymentRolloutReceipt(rollout, { auditedAt: "2026-08-18T09:20:00.000Z" });
  const plan = buildFlexiblePaymentRollbackPlan(receipt);
  return { receipt, plan };
}

function repositoryWith(block) {
  const deleted = [];
  const client = {
    pageBlock: {
      findFirst: async () => block,
      delete: async ({ where }) => {
        deleted.push(where.id);
        return { id: where.id };
      },
    },
  };
  return {
    deleted,
    prisma: {
      $transaction: async (fn) => fn(client),
    },
  };
}

test("accepts an untouched rollback plan", () => {
  const { plan } = fixture();
  assert.equal(verifyRollbackPlan(plan).valid, true);
});

test("rejects a tampered rollback plan", () => {
  const { plan } = fixture();
  plan.entries[0].blockId = "foreign";
  assert.equal(verifyRollbackPlan(plan).valid, false);
});

test("requires explicit confirmation and selection", async () => {
  const { receipt, plan } = fixture();
  const repository = repositoryWith(null);
  await assert.rejects(
    () => applyFlexiblePaymentNetworkRollback(repository, {
      receipt,
      plan,
      planFingerprint: plan.fingerprint,
      blockIds: ["block-1"],
    }),
    { code: "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_CONFIRM_REQUIRED" }
  );
  await assert.rejects(
    () => applyFlexiblePaymentNetworkRollback(repository, {
      receipt,
      plan,
      planFingerprint: plan.fingerprint,
      blockIds: [],
      confirm: true,
    }),
    { code: "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_SELECTION_REQUIRED" }
  );
});

test("rejects blocks outside the sealed plan", async () => {
  const { receipt, plan } = fixture();
  await assert.rejects(
    () => applyFlexiblePaymentNetworkRollback(repositoryWith(null), {
      receipt,
      plan,
      planFingerprint: plan.fingerprint,
      blockIds: ["block-other"],
      confirm: true,
    }),
    { code: "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_BLOCK_NOT_IN_PLAN" }
  );
});

test("revalidates ownership before deleting a block", async () => {
  const { receipt, plan } = fixture();
  const repository = repositoryWith({
    id: "block-1",
    pageId: "page-1",
    blockType: "cta",
    seo: { purpose: "manual", source: "editor" },
  });
  await assert.rejects(
    () => applyFlexiblePaymentNetworkRollback(repository, {
      receipt,
      plan,
      planFingerprint: plan.fingerprint,
      blockIds: ["block-1"],
      confirm: true,
    }),
    { code: "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_FOREIGN_BLOCK" }
  );
  assert.deepEqual(repository.deleted, []);
});

test("deletes only verified flexible payment blocks and is absence-tolerant", async () => {
  const { receipt, plan } = fixture();
  const repository = repositoryWith({
    id: "block-1",
    pageId: "page-1",
    blockType: "flexible_payment",
    seo: { purpose: "flexible-payment", source: "mse-25.32" },
  });
  const result = await applyFlexiblePaymentNetworkRollback(repository, {
    receipt,
    plan,
    planFingerprint: plan.fingerprint,
    blockIds: ["block-1"],
    confirm: true,
  });
  assert.deepEqual(repository.deleted, ["block-1"]);
  assert.equal(result.summary.rolledBackBlocks, 1);

  const absent = await applyFlexiblePaymentNetworkRollback(repositoryWith(null), {
    receipt,
    plan,
    planFingerprint: plan.fingerprint,
    blockIds: ["block-1"],
    confirm: true,
  });
  assert.equal(absent.summary.skippedBlocks, 1);
  assert.equal(absent.skipped[0].reason, "block-already-absent");
});
