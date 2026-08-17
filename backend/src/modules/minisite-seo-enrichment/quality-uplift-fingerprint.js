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
  const json = JSON.stringify(stableValue(fingerprintPayload(preview)));
  return crypto.createHash("sha256").update(json).digest("hex");
}

module.exports = {
  fingerprintPayload,
  qualityUpliftFingerprint,
  stableValue,
};
