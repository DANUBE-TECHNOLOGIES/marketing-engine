"use strict";

const crypto = require("node:crypto");
const { normalizePaymentPolicy } = require("./payment-experience");

const SOURCE = "mse-25.41";
const DEFAULT_NETWORK_POLICY = Object.freeze({
  enabled: true,
  products: ["flight", "travel"],
  installmentCounts: [],
  feeMode: "unspecified",
  ctaMode: "contact",
  disclaimer: "Selon votre réservation et sous réserve des conditions applicables. Renseignez-vous auprès de votre agence.",
  ctaLabel: "Étudier mes possibilités de paiement",
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((result, key) => {
    result[key] = canonicalize(value[key]);
    return result;
  }, {});
}

function fingerprint(value) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function buildFlexiblePaymentNetworkPolicyPreview(sites = [], inputPolicy = DEFAULT_NETWORK_POLICY) {
  const policy = normalizePaymentPolicy(inputPolicy);
  const rows = [];
  for (const site of Array.isArray(sites) ? sites : []) {
    const configured = Boolean(site?.paymentPolicy && typeof site.paymentPolicy === "object");
    rows.push({
      siteId: site?.id || null,
      slug: site?.slug || null,
      agencyId: site?.agencyId || null,
      configured,
      action: configured ? "preserve" : "configure",
    });
  }
  const preview = {
    version: SOURCE,
    readOnly: true,
    writes: false,
    policy,
    sites: rows,
    summary: {
      total: rows.length,
      configurable: rows.filter((row) => row.action === "configure").length,
      preserved: rows.filter((row) => row.action === "preserve").length,
    },
  };
  return { ...preview, fingerprint: fingerprint(preview) };
}

function assertNetworkPolicyApplyAllowed({ preview, previewFingerprint, confirm, siteIds }) {
  if (confirm !== true) {
    const error = new Error("Flexible payment network policy update requires confirm=true.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_POLICY_CONFIRM_REQUIRED";
    error.status = 400;
    throw error;
  }
  if (!previewFingerprint || previewFingerprint !== preview.fingerprint) {
    const error = new Error("Flexible payment network policy preview is stale.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_POLICY_PREVIEW_STALE";
    error.status = 409;
    throw error;
  }
  if (!Array.isArray(siteIds) || siteIds.length === 0) {
    const error = new Error("At least one explicit siteId is required for network policy update.");
    error.code = "FLEXIBLE_PAYMENT_NETWORK_POLICY_SELECTION_REQUIRED";
    error.status = 400;
    throw error;
  }
}

async function applyFlexiblePaymentNetworkPolicy(policyRepository, {
  sites = [], siteIds = [], policy: inputPolicy = DEFAULT_NETWORK_POLICY,
  previewFingerprint, confirm = false, overwrite = false,
} = {}) {
  const preview = buildFlexiblePaymentNetworkPolicyPreview(sites, inputPolicy);
  assertNetworkPolicyApplyAllowed({ preview, previewFingerprint, confirm, siteIds });
  const selected = [...new Set(siteIds.map(String))];
  const rowsById = new Map(preview.sites.map((row) => [String(row.siteId), row]));
  const unknown = selected.filter((siteId) => !rowsById.has(siteId));
  if (unknown.length) {
    const error = new Error(`Unknown flexible payment site: ${unknown[0]}.`);
    error.code = "FLEXIBLE_PAYMENT_NETWORK_POLICY_SITE_UNKNOWN";
    error.status = 404;
    throw error;
  }
  const applied = [];
  const preserved = [];
  for (const siteId of selected) {
    const row = rowsById.get(siteId);
    if (row.configured && overwrite !== true) {
      preserved.push({ ...row, reason: "existing-policy-preserved" });
      continue;
    }
    const savedPolicy = await policyRepository.upsert(siteId, preview.policy);
    applied.push({ ...row, policy: savedPolicy });
  }
  return {
    version: SOURCE,
    fingerprint: preview.fingerprint,
    applied,
    preserved,
    summary: {
      selectedSites: selected.length,
      configuredSites: applied.length,
      preservedSites: preserved.length,
    },
  };
}

module.exports = {
  SOURCE,
  DEFAULT_NETWORK_POLICY,
  applyFlexiblePaymentNetworkPolicy,
  assertNetworkPolicyApplyAllowed,
  buildFlexiblePaymentNetworkPolicyPreview,
  fingerprint,
};
