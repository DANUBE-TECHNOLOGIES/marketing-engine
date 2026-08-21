"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildFlexiblePaymentRollbackPlan,
  buildFlexiblePaymentRolloutReceipt,
  normalizeAppliedBlocks,
  verifyFlexiblePaymentRolloutReceipt,
} = require("../src/modules/flexible-payment-experience/rollout-audit");

function rolloutFixture() {
  return {
    version: "mse-25.35",
    fingerprint: "network-fingerprint-1",
    selected: 2,
    applied: [
      {
        siteId: "site-b",
        slug: "gien",
        agencyId: "agency-b",
        result: {
          applied: [
            { pageId: "page-2", blockId: "block-2", placement: "enriched", rollbackVersion: 4 },
          ],
          summary: { applied: 1 },
        },
      },
      {
        siteId: "site-a",
        slug: "dax",
        agencyId: "agency-a",
        result: {
          applied: [
            { pageId: "page-1", blockId: "block-1", placement: "compact", rollbackVersion: 3 },
          ],
          summary: { applied: 1 },
        },
      },
    ],
    summary: { selectedSites: 2, appliedSites: 2, appliedBlocks: 2 },
  };
}

test("MSE-25.36 normalizes applied blocks deterministically", () => {
  const blocks = normalizeAppliedBlocks(rolloutFixture());
  assert.deepEqual(blocks.map((item) => item.siteId), ["site-a", "site-b"]);
  assert.equal(blocks[0].blockId, "block-1");
});

test("MSE-25.36 creates a deterministic receipt bound to rollout fingerprint", () => {
  const first = buildFlexiblePaymentRolloutReceipt(rolloutFixture(), { auditedAt: "2026-08-18T09:20:00Z" });
  const second = buildFlexiblePaymentRolloutReceipt(rolloutFixture(), { auditedAt: "2026-08-18T09:20:00Z" });
  assert.equal(first.receiptFingerprint, second.receiptFingerprint);
  assert.equal(first.rolloutFingerprint, "network-fingerprint-1");
  assert.equal(first.summary.appliedBlocks, 2);
});

test("MSE-25.36 detects receipt tampering", () => {
  const receipt = buildFlexiblePaymentRolloutReceipt(rolloutFixture());
  receipt.appliedBlocks[0].blockId = "substituted";
  const verification = verifyFlexiblePaymentRolloutReceipt(receipt);
  assert.equal(verification.valid, false);
  assert.equal(verification.reason, "receipt-fingerprint-mismatch");
});

test("MSE-25.36 rollback plan is read-only and limited to receipt blocks", () => {
  const receipt = buildFlexiblePaymentRolloutReceipt(rolloutFixture());
  const plan = buildFlexiblePaymentRollbackPlan(receipt);
  assert.equal(plan.readOnly, true);
  assert.equal(plan.writes, false);
  assert.equal(plan.summary.sites, 2);
  assert.equal(plan.summary.blocks, 2);
  assert.deepEqual(plan.entries[0], {
    siteId: "site-a",
    pageId: "page-1",
    blockId: "block-1",
    rollbackVersion: 3,
  });
});

test("MSE-25.36 refuses incomplete rollout evidence", () => {
  assert.throws(
    () => buildFlexiblePaymentRolloutReceipt({ version: "mse-25.35", applied: [] }),
    (error) => error.code === "FLEXIBLE_PAYMENT_AUDIT_FINGERPRINT_REQUIRED"
  );
});

test("MSE-25.36 refuses an invalid receipt before rollback planning", () => {
  assert.throws(
    () => buildFlexiblePaymentRollbackPlan({ version: "mse-25.36" }),
    (error) => error.code === "FLEXIBLE_PAYMENT_ROLLBACK_RECEIPT_INVALID"
  );
});
