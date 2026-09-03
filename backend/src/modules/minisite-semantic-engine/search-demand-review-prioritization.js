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

function normalizeStrength(value) {
  return String(value || "").toLowerCase();
}

function priorityScore(signal = {}) {
  const strength = normalizeStrength(signal.evidenceStrength || signal.evidenceLevel);
  const impressions = Number(signal.impressions || 0);
  const clicks = Number(signal.clicks || 0);
  const position = Number(signal.position || 0);
  let score = strength === "high" ? 60 : strength === "medium" ? 40 : 0;
  if (impressions >= 100) score += 20;
  else if (impressions >= 30) score += 10;
  if (position > 0 && position <= 10) score += 5;
  else if (position > 10 && position <= 20) score += 15;
  else if (position > 20 && position <= 40) score += 10;
  if (clicks > 0) score += 5;
  return Math.min(score, 100);
}

function priorityBand(score) {
  if (score >= 80) return "HIGH_REVIEW_PRIORITY";
  if (score >= 55) return "MEDIUM_REVIEW_PRIORITY";
  return "LOW_REVIEW_PRIORITY";
}

function signalKey(signal = {}) {
  return [signal.siteSlug || "", signal.intentKey || signal.intent || ""].join("::");
}

function buildSearchDemandReviewPrioritization({ queue, lifecycle, generatedAt = new Date().toISOString() } = {}) {
  if (!queue || queue.readOnly !== true || queue.writes !== false || queue.policy?.humanReviewRequired !== true) {
    throw new Error("MSE_25_52_UNSAFE_REVIEW_QUEUE");
  }
  if (Number(queue.summary?.executableCount || 0) !== 0 || Number(queue.summary?.automaticWriteCount || 0) !== 0) {
    throw new Error("MSE_25_52_EXECUTABLE_SOURCE_FORBIDDEN");
  }
  if (!lifecycle || lifecycle.readOnly !== true || lifecycle.writes !== false) {
    throw new Error("MSE_25_52_UNSAFE_LIFECYCLE");
  }

  const signals = new Map((lifecycle.signals || []).map((signal) => [signalKey(signal), signal]));
  const items = (queue.items || []).map((item) => {
    const signal = signals.get(signalKey(item)) || {};
    const score = priorityScore(signal);
    return {
      key: item.key,
      siteSlug: item.siteSlug || signal.siteSlug || null,
      city: signal.city || null,
      intentKey: item.intent || signal.intentKey || null,
      evidenceStrength: signal.evidenceStrength || item.evidenceLevel || null,
      impressions: Number(signal.impressions || 0),
      clicks: Number(signal.clicks || 0),
      position: Number(signal.position || 0),
      qualifyingSnapshotCount: Number(signal.qualifyingSnapshotCount || 0),
      priorityScore: score,
      priorityBand: priorityBand(score),
      reviewReason: item.reviewReason || "PERSISTENT_SEARCH_DEMAND_EVIDENCE",
      reviewOnly: true,
      executable: false,
      automaticWrite: false,
    };
  }).sort((a, b) => b.priorityScore - a.priorityScore || String(a.key).localeCompare(String(b.key)));

  const result = {
    type: "MSE_25_52_SEARCH_DEMAND_REVIEW_PRIORITIZATION",
    generatedAt,
    readOnly: true,
    writes: false,
    publicWrites: false,
    sourceQueueFingerprint: queue.queueFingerprint || null,
    sourceLifecycleFingerprint: lifecycle.lifecycleFingerprint || null,
    dataState: queue.dataState || lifecycle.dataState || null,
    lifecycleState: queue.lifecycleState || lifecycle.lifecycleState || null,
    items,
    summary: {
      prioritizedReviewItemCount: items.length,
      highPriorityCount: items.filter((item) => item.priorityBand === "HIGH_REVIEW_PRIORITY").length,
      mediumPriorityCount: items.filter((item) => item.priorityBand === "MEDIUM_REVIEW_PRIORITY").length,
      lowPriorityCount: items.filter((item) => item.priorityBand === "LOW_REVIEW_PRIORITY").length,
      executableCount: 0,
      automaticWriteCount: 0,
    },
    policy: {
      rankingIsAdvisoryOnly: true,
      humanReviewRequired: true,
      persistentEvidenceRequired: true,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      noAutomaticPublication: true,
      websiteDesignerMutation: false,
      automaticWrites: false,
    },
  };
  result.prioritizationFingerprint = fingerprint(result);
  return result;
}

module.exports = { buildSearchDemandReviewPrioritization, priorityScore, priorityBand, fingerprint };
