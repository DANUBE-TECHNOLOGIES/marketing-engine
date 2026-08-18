"use strict";

const crypto = require("node:crypto");
const { buildPaymentPlacementPreview, applyPaymentPlacementPreview } = require("./placement-executor");
const { assessFlexiblePaymentSiteReadiness } = require("./network-readiness");

const SOURCE = "mse-25.35";

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = canonicalize(value[key]);
    return result;
  }, {});
}

function fingerprint(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function buildFlexiblePaymentNetworkRolloutPreview(sites = []) {
  const eligible = [];
  const excluded = [];

  for (const site of Array.isArray(sites) ? sites : []) {
    const readiness = assessFlexiblePaymentSiteReadiness(site);
    if (readiness.status !== "ready") {
      excluded.push({
        siteId: readiness.siteId,
        slug: readiness.slug,
        agencyId: readiness.agencyId,
        status: readiness.status,
        reasons: readiness.reasons,
      });
      continue;
    }

    const preview = buildPaymentPlacementPreview({ site });
    eligible.push({
      siteId: site.id,
      slug: site.slug || null,
      agencyId: site.agencyId || null,
      status: "ready",
      proposalCount: preview.proposals.length,
      previewFingerprint: preview.fingerprint,
    });
  }

  const networkFingerprint = fingerprint({
    version: SOURCE,
    eligible,
    excluded,
  });

  return {
    version: SOURCE,
    readOnly: true,
    writes: false,
    fingerprint: networkFingerprint,
    eligible,
    excluded,
    summary: {
      total: (Array.isArray(sites) ? sites : []).length,
      eligible: eligible.length,
      excluded: excluded.length,
      proposedBlocks: eligible.reduce((sum, item) => sum + item.proposalCount, 0),
    },
  };
}

function assertNetworkApplyAllowed({ preview, previewFingerprint, confirm, siteIds }) {
  if (confirm !== true) {
    const error = new Error("Flexible payment network rollout requires confirm=true.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_CONFIRM_REQUIRED";
    error.status = 400;
    throw error;
  }

  if (!previewFingerprint || previewFingerprint !== preview.fingerprint) {
    const error = new Error("Flexible payment network rollout preview is stale.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_PREVIEW_STALE";
    error.status = 409;
    throw error;
  }

  if (!Array.isArray(siteIds) || siteIds.length === 0) {
    const error = new Error("At least one explicit siteId is required for network rollout.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_SELECTION_REQUIRED";
    error.status = 400;
    throw error;
  }
}

async function applyFlexiblePaymentNetworkRollout(repository, {
  sites = [],
  siteIds = [],
  previewFingerprint,
  confirm = false,
  createdBy = SOURCE,
} = {}) {
  const preview = buildFlexiblePaymentNetworkRolloutPreview(sites);
  assertNetworkApplyAllowed({ preview, previewFingerprint, confirm, siteIds });

  const requestedIds = [...new Set(siteIds.map((value) => String(value)))]
  const eligibleById = new Map(preview.eligible.map((item) => [String(item.siteId), item]));
  const sitesById = new Map((Array.isArray(sites) ? sites : []).map((site) => [String(site.id), site]));

  const unknown = requestedIds.filter((siteId) => !eligibleById.has(siteId));
  if (unknown.length) {
    const error = new Error(`Selected site is not rollout-ready: ${unknown[0]}.`);
    error.code = "FLEXIBLE_PAYMENT_NETWORK_SITE_NOT_READY";
    error.status = 409;
    throw error;
  }

  const applied = [];
  for (const siteId of requestedIds) {
    const site = sitesById.get(siteId);
    const eligible = eligibleById.get(siteId);
    const result = await applyPaymentPlacementPreview(repository, {
      site,
      previewFingerprint: eligible.previewFingerprint,
      confirm: true,
      createdBy,
    });

    applied.push({
      siteId,
      slug: site.slug || null,
      agencyId: site.agencyId || null,
      result,
    });
  }

  return {
    version: SOURCE,
    fingerprint: preview.fingerprint,
    selected: requestedIds.length,
    applied,
    summary: {
      selectedSites: requestedIds.length,
      appliedSites: applied.length,
      appliedBlocks: applied.reduce((sum, item) => sum + Number(item.result?.summary?.applied || 0), 0),
    },
  };
}

module.exports = {
  SOURCE,
  applyFlexiblePaymentNetworkRollout,
  assertNetworkApplyAllowed,
  buildFlexiblePaymentNetworkRolloutPreview,
  fingerprint,
};
