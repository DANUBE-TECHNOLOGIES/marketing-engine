"use strict";

const crypto = require("node:crypto");

const ALLOWED_DECISIONS = Object.freeze([
  "KEEP_AS_IS",
  "REFINE_EXISTING_PAGE",
  "REQUEST_MORE_EVIDENCE",
]);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function findPacket(packetReport, packetKey) {
  if (!packetReport || packetReport.readOnly !== true || packetReport.writes === true || packetReport.publicWrites === true) {
    throw new Error("MSE_25_54_UNSAFE_PACKET_REPORT");
  }
  if (Number(packetReport.summary?.executableCount || 0) !== 0 || Number(packetReport.summary?.automaticWriteCount || 0) !== 0) {
    throw new Error("MSE_25_54_EXECUTABLE_PACKET_REPORT_FORBIDDEN");
  }
  const packet = (packetReport.packets || []).find((item) => item.key === packetKey);
  if (!packet) throw new Error(`MSE_25_54_PACKET_NOT_FOUND:${packetKey || "null"}`);
  if (packet.humanDecisionRequired !== true || packet.reviewOnly !== true || packet.executable !== false || packet.automaticWrite !== false) {
    throw new Error(`MSE_25_54_UNSAFE_PACKET:${packetKey}`);
  }
  return packet;
}

function buildHumanSeoReviewDecision({ packetReport, packetKey, decision, reviewer, rationale, decidedAt = new Date().toISOString() } = {}) {
  if (!ALLOWED_DECISIONS.includes(decision)) throw new Error(`MSE_25_54_INVALID_DECISION:${decision || "null"}`);
  if (!reviewer || !String(reviewer).trim()) throw new Error("MSE_25_54_REVIEWER_REQUIRED");
  if (!rationale || String(rationale).trim().length < 8) throw new Error("MSE_25_54_RATIONALE_REQUIRED");

  const packet = findPacket(packetReport, packetKey);
  if (!Array.isArray(packet.decisionOptions) || !packet.decisionOptions.includes(decision)) {
    throw new Error(`MSE_25_54_DECISION_NOT_ALLOWED_FOR_PACKET:${decision}`);
  }

  const decisionRecord = {
    type: "MSE_25_54_HUMAN_SEO_REVIEW_DECISION",
    decidedAt,
    reviewer: String(reviewer).trim(),
    rationale: String(rationale).trim(),
    decision,
    packetKey: packet.key,
    siteSlug: packet.siteSlug,
    intent: packet.intent,
    query: packet.query,
    page: packet.page,
    priority: packet.priority,
    priorityScore: packet.priorityScore,
    evidenceLevel: packet.evidenceLevel,
    impressions: packet.impressions,
    clicks: packet.clicks,
    position: packet.position,
    lifecycleStatus: packet.lifecycleStatus,
    sourcePacketFingerprint: packetReport.packetFingerprint || null,
    sourcePrioritizationFingerprint: packetReport.sourcePrioritizationFingerprint || null,
    humanDecision: true,
    reviewOnly: true,
    executable: false,
    automaticWrite: false,
    pageCreationAllowed: false,
    publicationAllowed: false,
    websiteDesignerMutationAllowed: false,
    nextStep: decision === "REFINE_EXISTING_PAGE" ? "PREPARE_NON_EXECUTABLE_EDITORIAL_MANDATE" : decision === "REQUEST_MORE_EVIDENCE" ? "CONTINUE_OBSERVATION" : "NO_CHANGE_REQUESTED",
  };
  decisionRecord.decisionFingerprint = fingerprint(decisionRecord);
  return decisionRecord;
}

function certifyHumanSeoReviewDecision(record) {
  const reasons = [];
  if (!record || record.type !== "MSE_25_54_HUMAN_SEO_REVIEW_DECISION") reasons.push("INVALID_TYPE");
  if (!ALLOWED_DECISIONS.includes(record?.decision)) reasons.push("INVALID_DECISION");
  if (record?.humanDecision !== true) reasons.push("HUMAN_DECISION_REQUIRED");
  if (record?.reviewOnly !== true) reasons.push("REVIEW_ONLY_REQUIRED");
  if (record?.executable !== false) reasons.push("EXECUTION_FORBIDDEN");
  if (record?.automaticWrite !== false) reasons.push("AUTOMATIC_WRITE_FORBIDDEN");
  if (record?.pageCreationAllowed !== false) reasons.push("PAGE_CREATION_FORBIDDEN");
  if (record?.publicationAllowed !== false) reasons.push("PUBLICATION_FORBIDDEN");
  if (record?.websiteDesignerMutationAllowed !== false) reasons.push("WEBSITE_DESIGNER_MUTATION_FORBIDDEN");
  if (!record?.reviewer) reasons.push("REVIEWER_REQUIRED");
  if (!record?.rationale) reasons.push("RATIONALE_REQUIRED");
  if (!record?.sourcePacketFingerprint) reasons.push("SOURCE_PACKET_FINGERPRINT_REQUIRED");
  return { certified: reasons.length === 0, reasons, executableCount: 0, automaticWriteCount: 0 };
}

module.exports = { ALLOWED_DECISIONS, buildHumanSeoReviewDecision, certifyHumanSeoReviewDecision, fingerprint };
