"use strict";

const crypto = require("node:crypto");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function buildSeoCertification(preview, { generatedAt = new Date().toISOString() } = {}) {
  if (preview?.readOnly !== true || preview?.writes !== false || preview?.destructive !== false) {
    const error = new Error("SEO certification requires a safe read-only semantic preview.");
    error.code = "MSE_25_47_UNSAFE_SOURCE";
    throw error;
  }

  const summary = preview.summary || {};
  const certification = {
    type: "mse-25.47-seo-observability-certification",
    generatedAt,
    sourcePlanFingerprint: preview.planFingerprint,
    tenantSlug: preview.tenantSlug || null,
    readOnly: true,
    writes: false,
    policy: {
      noAutomaticWrites: preview?.policy?.automaticWrites === false,
      managedRoutesAware: preview?.policy?.managedRoutesAware === true,
      observeBeforeOptimize: true,
      semanticGapsAreNotWriteInstructions: true,
    },
    metrics: {
      agenciesProcessed: Number(summary.agenciesProcessed || 0),
      agenciesExcluded: Number(summary.agenciesExcluded || 0),
      publishedPageCount: Number(summary.publishedPageCount || 0),
      strongIntentCount: Number(summary.strongIntentCount || 0),
      coveredIntentCount: Number(summary.coveredIntentCount || 0),
      semanticGapCount: Number(summary.semanticGapCount || 0),
      commercialGapCount: Number(summary.commercialGapCount || 0),
      semanticOrphanPageCount: Number(summary.semanticOrphanPageCount || 0),
      cannibalizationConflictCount: Number(summary.cannibalizationConflictCount || 0),
      blockingConflictCount: Number(summary.blockingConflictCount || 0),
      automaticWriteCount: Number(summary.automaticWriteCount || 0),
    },
  };

  certification.health = {
    safe: certification.policy.noAutomaticWrites && certification.metrics.automaticWriteCount === 0 && certification.metrics.blockingConflictCount === 0,
    requiresHumanSeoReview: certification.metrics.semanticGapCount > 0 || certification.metrics.semanticOrphanPageCount > 0 || certification.metrics.cannibalizationConflictCount > 0,
    automaticRemediationAllowed: false,
  };
  certification.certificationFingerprint = fingerprint(certification);
  return certification;
}

module.exports = { buildSeoCertification, fingerprint };
