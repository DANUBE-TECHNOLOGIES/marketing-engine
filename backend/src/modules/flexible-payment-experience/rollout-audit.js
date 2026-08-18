"use strict";

const { fingerprint } = require("./network-rollout");

const SOURCE = "mse-25.36";

function normalizeAppliedBlocks(rollout = {}) {
  const rows = [];
  for (const siteResult of Array.isArray(rollout.applied) ? rollout.applied : []) {
    const siteId = siteResult.siteId == null ? null : String(siteResult.siteId);
    const result = siteResult.result || {};
    for (const block of Array.isArray(result.applied) ? result.applied : []) {
      if (!siteId || !block?.pageId || !block?.blockId) continue;
      rows.push({
        siteId,
        slug: siteResult.slug || null,
        agencyId: siteResult.agencyId || null,
        pageId: String(block.pageId),
        blockId: String(block.blockId),
        placement: block.placement || null,
        rollbackVersion: Number(block.rollbackVersion || 0) || null,
      });
    }
  }
  return rows.sort((a, b) =>
    `${a.siteId}:${a.pageId}:${a.blockId}`.localeCompare(`${b.siteId}:${b.pageId}:${b.blockId}`)
  );
}

function assertValidRolloutResult(rollout = {}) {
  if (!rollout || typeof rollout !== "object") {
    throw new TypeError("Rollout result is required.");
  }
  if (rollout.version !== "mse-25.35") {
    const error = new Error("Unsupported flexible payment rollout result.");
    error.code = "FLEXIBLE_PAYMENT_AUDIT_UNSUPPORTED_ROLLOUT";
    error.status = 400;
    throw error;
  }
  if (!rollout.fingerprint) {
    const error = new Error("Rollout fingerprint is required for audit.");
    error.code = "FLEXIBLE_PAYMENT_AUDIT_FINGERPRINT_REQUIRED";
    error.status = 400;
    throw error;
  }
  const selected = Number(rollout.selected || rollout.summary?.selectedSites || 0);
  const appliedSites = Array.isArray(rollout.applied) ? rollout.applied.length : 0;
  if (selected < appliedSites) {
    const error = new Error("Rollout result is internally inconsistent.");
    error.code = "FLEXIBLE_PAYMENT_AUDIT_INCONSISTENT_ROLLOUT";
    error.status = 409;
    throw error;
  }
}

function buildFlexiblePaymentRolloutReceipt(rollout, { auditedAt } = {}) {
  assertValidRolloutResult(rollout);
  const appliedBlocks = normalizeAppliedBlocks(rollout);
  const selectedSites = Number(rollout.selected || rollout.summary?.selectedSites || 0);
  const appliedSites = Array.isArray(rollout.applied) ? rollout.applied.length : 0;

  const payload = {
    version: SOURCE,
    source: SOURCE,
    rolloutVersion: rollout.version,
    rolloutFingerprint: rollout.fingerprint,
    auditedAt: auditedAt || null,
    selectedSites,
    appliedSites,
    appliedBlocks,
  };

  return {
    ...payload,
    receiptFingerprint: fingerprint(payload),
    summary: {
      selectedSites,
      appliedSites,
      appliedBlocks: appliedBlocks.length,
    },
  };
}

function verifyFlexiblePaymentRolloutReceipt(receipt = {}) {
  if (!receipt || receipt.version !== SOURCE || !receipt.rolloutFingerprint || !receipt.receiptFingerprint) {
    return { valid: false, reason: "receipt-shape-invalid" };
  }
  const payload = {
    version: receipt.version,
    source: receipt.source,
    rolloutVersion: receipt.rolloutVersion,
    rolloutFingerprint: receipt.rolloutFingerprint,
    auditedAt: receipt.auditedAt || null,
    selectedSites: Number(receipt.selectedSites || 0),
    appliedSites: Number(receipt.appliedSites || 0),
    appliedBlocks: Array.isArray(receipt.appliedBlocks) ? receipt.appliedBlocks : [],
  };
  const expected = fingerprint(payload);
  return expected === receipt.receiptFingerprint
    ? { valid: true, fingerprint: expected }
    : { valid: false, reason: "receipt-fingerprint-mismatch", fingerprint: expected };
}

function buildFlexiblePaymentRollbackPlan(receipt = {}) {
  const verification = verifyFlexiblePaymentRolloutReceipt(receipt);
  if (!verification.valid) {
    const error = new Error("Flexible payment rollout receipt is invalid.");
    error.code = "FLEXIBLE_PAYMENT_ROLLBACK_RECEIPT_INVALID";
    error.status = 409;
    throw error;
  }

  const entries = (Array.isArray(receipt.appliedBlocks) ? receipt.appliedBlocks : []).map((block) => ({
    siteId: block.siteId,
    pageId: block.pageId,
    blockId: block.blockId,
    rollbackVersion: block.rollbackVersion || null,
  }));

  const planPayload = {
    version: SOURCE,
    sourceReceiptFingerprint: receipt.receiptFingerprint,
    rolloutFingerprint: receipt.rolloutFingerprint,
    entries,
  };

  return {
    ...planPayload,
    readOnly: true,
    writes: false,
    fingerprint: fingerprint(planPayload),
    summary: {
      sites: new Set(entries.map((entry) => entry.siteId)).size,
      blocks: entries.length,
    },
  };
}

module.exports = {
  SOURCE,
  assertValidRolloutResult,
  buildFlexiblePaymentRollbackPlan,
  buildFlexiblePaymentRolloutReceipt,
  normalizeAppliedBlocks,
  verifyFlexiblePaymentRolloutReceipt,
};
