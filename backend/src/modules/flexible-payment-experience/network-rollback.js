"use strict";

const { PURPOSE: PAYMENT_PURPOSE, SOURCE: PAYMENT_SOURCE } = require("./placement-executor");
const { verifyFlexiblePaymentRolloutReceipt } = require("./rollout-audit");
const { fingerprint } = require("./network-rollout");

const SOURCE = "mse-25.37";

function verifyRollbackPlan(plan = {}) {
  if (!plan || typeof plan !== "object" || !plan.sourceReceiptFingerprint || !plan.rolloutFingerprint) {
    return { valid: false, reason: "rollback-plan-shape-invalid" };
  }
  const payload = {
    version: plan.version,
    sourceReceiptFingerprint: plan.sourceReceiptFingerprint,
    rolloutFingerprint: plan.rolloutFingerprint,
    entries: Array.isArray(plan.entries) ? plan.entries : [],
  };
  const expected = fingerprint(payload);
  return expected === plan.fingerprint
    ? { valid: true, fingerprint: expected }
    : { valid: false, reason: "rollback-plan-fingerprint-mismatch", fingerprint: expected };
}

function assertRollbackAllowed({ receipt, plan, planFingerprint, confirm, blockIds }) {
  const receiptVerification = verifyFlexiblePaymentRolloutReceipt(receipt);
  if (!receiptVerification.valid) {
    const error = new Error("Flexible payment rollout receipt is invalid.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_RECEIPT_INVALID";
    error.status = 409;
    throw error;
  }

  const planVerification = verifyRollbackPlan(plan);
  if (!planVerification.valid || plan.sourceReceiptFingerprint !== receipt.receiptFingerprint) {
    const error = new Error("Flexible payment rollback plan is invalid.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_PLAN_INVALID";
    error.status = 409;
    throw error;
  }

  if (confirm !== true) {
    const error = new Error("Flexible payment network rollback requires confirm=true.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_CONFIRM_REQUIRED";
    error.status = 400;
    throw error;
  }

  if (!planFingerprint || planFingerprint !== plan.fingerprint) {
    const error = new Error("Flexible payment rollback plan is stale.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_PLAN_STALE";
    error.status = 409;
    throw error;
  }

  if (!Array.isArray(blockIds) || blockIds.length === 0) {
    const error = new Error("At least one explicit blockId is required for rollback.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_SELECTION_REQUIRED";
    error.status = 400;
    throw error;
  }
}

async function applyFlexiblePaymentNetworkRollback(repository, {
  receipt,
  plan,
  planFingerprint,
  blockIds = [],
  confirm = false,
} = {}) {
  assertRollbackAllowed({ receipt, plan, planFingerprint, confirm, blockIds });

  const selectedIds = [...new Set(blockIds.map((value) => String(value)))];
  const entriesByBlockId = new Map((plan.entries || []).map((entry) => [String(entry.blockId), entry]));
  const unknown = selectedIds.filter((blockId) => !entriesByBlockId.has(blockId));
  if (unknown.length) {
    const error = new Error(`Selected block is not part of rollback plan: ${unknown[0]}.`);
    error.code = "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_BLOCK_NOT_IN_PLAN";
    error.status = 409;
    throw error;
  }

  return repository.prisma.$transaction(async (client) => {
    const rolledBack = [];
    const skipped = [];

    for (const blockId of selectedIds) {
      const entry = entriesByBlockId.get(blockId);
      const block = await client.pageBlock.findFirst({
        where: { id: blockId, pageId: entry.pageId },
      });

      if (!block) {
        skipped.push({ blockId, pageId: entry.pageId, reason: "block-already-absent" });
        continue;
      }

      const seo = block.seo || {};
      if (block.blockType !== "flexible_payment" || seo.purpose !== PAYMENT_PURPOSE || seo.source !== PAYMENT_SOURCE) {
        const error = new Error(`Refusing to rollback foreign block: ${blockId}.`);
        error.code = "FLEXIBLE_PAYMENT_NETWORK_ROLLBACK_FOREIGN_BLOCK";
        error.status = 409;
        throw error;
      }

      await client.pageBlock.delete({ where: { id: blockId } });
      rolledBack.push({
        siteId: entry.siteId,
        pageId: entry.pageId,
        blockId,
      });
    }

    return {
      version: SOURCE,
      receiptFingerprint: receipt.receiptFingerprint,
      planFingerprint: plan.fingerprint,
      selected: selectedIds.length,
      rolledBack,
      skipped,
      summary: {
        selectedBlocks: selectedIds.length,
        rolledBackBlocks: rolledBack.length,
        skippedBlocks: skipped.length,
      },
    };
  });
}

module.exports = {
  SOURCE,
  applyFlexiblePaymentNetworkRollback,
  assertRollbackAllowed,
  verifyRollbackPlan,
};
