"use strict";

const crypto = require("node:crypto");

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("hex");
}

function fingerprintPayload(preview = {}) {
  return {
    version: preview.version || "mse-25.31",
    siteSlug: preview.siteSlug || null,
    agencyId: preview.agencyId || null,
    minimumWords: preview.minimumWords || null,
    actions: (preview.actions || []).map((action) => ({
      pageSlug: action.pageSlug,
      priority: action.priority,
      priorityScore: action.priorityScore,
      recommendedFields: action.recommendedFields || [],
      suggestedSourceSlugs: action.suggestedSourceSlugs || [],
      intentQuality: action.intentQuality
        ? {
            intent: action.intentQuality.intent,
            currentScore: action.intentQuality.currentScore,
            currentStatus: action.intentQuality.currentStatus,
            missingSignals: action.intentQuality.missingSignals || [],
          }
        : null,
      thinContent: action.thinContent
        ? {
            wordCount: action.thinContent.wordCount,
            minimumWords: action.thinContent.minimumWords,
            missingWords: action.thinContent.missingWords,
          }
        : null,
      internalLink: action.internalLink
        ? {
            path: action.internalLink.path,
            suggestedSourceSlugs: action.internalLink.suggestedSourceSlugs || [],
          }
        : null,
    })),
  };
}

function qualityUpliftFingerprint(preview = {}) {
  return digest(fingerprintPayload(preview));
}

function networkFingerprintPayload(preview = {}) {
  return {
    version: preview.version || "mse-25.31",
    minimumWords: Number(preview.minimumWords || 120),
    agencies: (preview.agencies || [])
      .map((agency) => ({
        siteSlug: agency.siteSlug || null,
        agencyId: agency.agencyId || null,
        fingerprint: agency.planFingerprint || qualityUpliftFingerprint(agency),
      }))
      .sort((left, right) =>
        String(left.siteSlug || "").localeCompare(String(right.siteSlug || ""), "fr")
      ),
    excludedSites: (preview.excludedSites || [])
      .map((site) => ({
        siteSlug: site.siteSlug || null,
        agencyId: site.agencyId || null,
        status: site.status || null,
        reason: site.reason || null,
      }))
      .sort((left, right) =>
        String(left.siteSlug || "").localeCompare(String(right.siteSlug || ""), "fr")
      ),
  };
}

function networkQualityUpliftFingerprint(preview = {}) {
  return digest(networkFingerprintPayload(preview));
}

module.exports = {
  digest,
  fingerprintPayload,
  networkFingerprintPayload,
  networkQualityUpliftFingerprint,
  qualityUpliftFingerprint,
  stableValue,
};
