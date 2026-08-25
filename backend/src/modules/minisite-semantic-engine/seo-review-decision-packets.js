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

function suggestedReviewType(item = {}) {
  const intent = String(item.intent || item.intentKey || "").toLowerCase();
  const position = Number(item.position || 0);
  const impressions = Number(item.impressions || 0);
  if (intent && position > 0 && position <= 20 && impressions >= 20) return "REVIEW_EXISTING_PAGE_ALIGNMENT";
  if (intent) return "REVIEW_INTENT_COVERAGE";
  return "REVIEW_SEARCH_DEMAND_CONTEXT";
}

function buildSeoReviewDecisionPackets({ prioritization, generatedAt = new Date().toISOString() } = {}) {
  if (!prioritization || prioritization.certified !== true) throw new Error("MSE_25_53_UNCERTIFIED_PRIORITIZATION");
  if (prioritization.writes === true || prioritization.publicWrites === true) throw new Error("MSE_25_53_UNSAFE_PRIORITIZATION");
  if (Number(prioritization.executableCount || prioritization.summary?.executableCount || 0) !== 0) throw new Error("MSE_25_53_EXECUTABLE_SOURCE_FORBIDDEN");
  if (Number(prioritization.automaticWriteCount || prioritization.summary?.automaticWriteCount || 0) !== 0) throw new Error("MSE_25_53_AUTOMATIC_WRITE_SOURCE_FORBIDDEN");

  const items = Array.isArray(prioritization.items) ? prioritization.items : [];
  const packets = items.map((item) => {
    if (item.reviewOnly !== true || item.executable !== false || item.automaticWrite !== false) {
      throw new Error(`MSE_25_53_UNSAFE_REVIEW_ITEM:${item.key || "unknown"}`);
    }
    return {
      key: item.key || null,
      siteSlug: item.siteSlug || null,
      intent: item.intent || item.intentKey || null,
      query: item.query || null,
      page: item.page || null,
      priority: item.priority || "LOW_REVIEW_PRIORITY",
      priorityScore: Number(item.priorityScore || 0),
      evidenceLevel: item.evidenceLevel || item.evidenceStrength || null,
      impressions: Number(item.impressions || 0),
      clicks: Number(item.clicks || 0),
      position: Number(item.position || 0),
      lifecycleStatus: item.lifecycleStatus || item.transition || null,
      suggestedReviewType: suggestedReviewType(item),
      decisionOptions: ["KEEP_AS_IS", "REFINE_EXISTING_PAGE", "REQUEST_MORE_EVIDENCE"],
      humanDecisionRequired: true,
      reviewOnly: true,
      executable: false,
      automaticWrite: false,
      pageCreationAllowed: false,
      publicationAllowed: false,
      websiteDesignerMutationAllowed: false,
    };
  }).sort((a, b) => {
    const order = { HIGH_REVIEW_PRIORITY: 0, MEDIUM_REVIEW_PRIORITY: 1, LOW_REVIEW_PRIORITY: 2 };
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9) || String(a.key).localeCompare(String(b.key));
  });

  const result = {
    type: "MSE_25_53_SEO_REVIEW_DECISION_PACKETS",
    generatedAt,
    readOnly: true,
    writes: false,
    publicWrites: false,
    sourcePrioritizationFingerprint: prioritization.prioritizationFingerprint || null,
    dataState: prioritization.dataState || null,
    lifecycleState: prioritization.lifecycleState || null,
    packets,
    summary: {
      packetCount: packets.length,
      highPriorityPacketCount: packets.filter((p) => p.priority === "HIGH_REVIEW_PRIORITY").length,
      mediumPriorityPacketCount: packets.filter((p) => p.priority === "MEDIUM_REVIEW_PRIORITY").length,
      lowPriorityPacketCount: packets.filter((p) => p.priority === "LOW_REVIEW_PRIORITY").length,
      executableCount: 0,
      automaticWriteCount: 0,
    },
    policy: {
      advisoryOnly: true,
      humanDecisionRequired: true,
      decisionDoesNotExecute: true,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      noAutomaticPublication: true,
      websiteDesignerMutation: false,
      automaticWrites: false,
    },
  };
  result.packetFingerprint = fingerprint(result);
  return result;
}

module.exports = { buildSeoReviewDecisionPackets, suggestedReviewType, fingerprint };
