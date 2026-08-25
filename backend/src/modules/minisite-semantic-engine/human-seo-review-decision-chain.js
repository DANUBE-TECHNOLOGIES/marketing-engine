"use strict";

const {
  buildHumanSeoReviewDecision,
  certifyHumanSeoReviewDecision,
  fingerprint,
} = require("./human-seo-review-decisions");

function certifyDecisionPacketSource(packetReport) {
  const reasons = [];
  if (!packetReport) reasons.push("SOURCE_REPORT_REQUIRED");
  if (packetReport?.readOnly !== true) reasons.push("SOURCE_READ_ONLY_REQUIRED");
  if (packetReport?.writes === true) reasons.push("SOURCE_WRITES_FORBIDDEN");
  if (packetReport?.publicWrites === true) reasons.push("SOURCE_PUBLIC_WRITES_FORBIDDEN");
  if (Number(packetReport?.summary?.executableCount || 0) !== 0) reasons.push("SOURCE_EXECUTABLE_COUNT_FORBIDDEN");
  if (Number(packetReport?.summary?.automaticWriteCount || 0) !== 0) reasons.push("SOURCE_AUTOMATIC_WRITE_COUNT_FORBIDDEN");
  if (!packetReport?.packetFingerprint) reasons.push("SOURCE_PACKET_FINGERPRINT_REQUIRED");
  return { certified: reasons.length === 0, reasons };
}

function buildHumanDecisionChain({ packetReport, packetKey, decision, reviewer, rationale, decidedAt } = {}) {
  const sourceCertification = certifyDecisionPacketSource(packetReport);
  if (!sourceCertification.certified) {
    throw new Error(`MSE_25_54_SOURCE_CERTIFICATION_FAILED:${sourceCertification.reasons.join(",")}`);
  }

  const record = buildHumanSeoReviewDecision({ packetReport, packetKey, decision, reviewer, rationale, decidedAt });
  const decisionCertification = certifyHumanSeoReviewDecision(record);
  if (!decisionCertification.certified) {
    throw new Error(`MSE_25_54_DECISION_CERTIFICATION_FAILED:${decisionCertification.reasons.join(",")}`);
  }

  const chain = {
    type: "MSE_25_54_HUMAN_DECISION_CHAIN",
    readOnly: true,
    writes: false,
    publicWrites: false,
    sourcePacketFingerprint: packetReport.packetFingerprint,
    sourcePrioritizationFingerprint: packetReport.sourcePrioritizationFingerprint || null,
    packetKey,
    decisionFingerprint: record.decisionFingerprint,
    sourceCertification,
    decisionCertification,
    decision: record,
    summary: { humanDecisionCount: 1, executableCount: 0, automaticWriteCount: 0, publicWriteCount: 0 },
    guards: {
      humanReviewRequired: true,
      automaticExecutionForbidden: true,
      automaticPageCreationForbidden: true,
      automaticPublicationForbidden: true,
      websiteDesignerMutationForbidden: true,
    },
  };
  chain.chainFingerprint = fingerprint(chain);
  return chain;
}

function certifyHumanDecisionChain(chain) {
  const reasons = [];
  if (!chain || chain.type !== "MSE_25_54_HUMAN_DECISION_CHAIN") reasons.push("INVALID_CHAIN_TYPE");
  if (chain?.readOnly !== true) reasons.push("READ_ONLY_REQUIRED");
  if (chain?.writes !== false || chain?.publicWrites !== false) reasons.push("WRITES_FORBIDDEN");
  if (Number(chain?.summary?.executableCount || 0) !== 0) reasons.push("EXECUTABLE_COUNT_FORBIDDEN");
  if (Number(chain?.summary?.automaticWriteCount || 0) !== 0) reasons.push("AUTOMATIC_WRITE_COUNT_FORBIDDEN");
  if (chain?.sourceCertification?.certified !== true) reasons.push("SOURCE_CERTIFICATION_REQUIRED");
  if (chain?.decisionCertification?.certified !== true) reasons.push("DECISION_CERTIFICATION_REQUIRED");
  if (chain?.decision?.sourcePacketFingerprint !== chain?.sourcePacketFingerprint) reasons.push("SOURCE_FINGERPRINT_MISMATCH");
  if (chain?.decision?.decisionFingerprint !== chain?.decisionFingerprint) reasons.push("DECISION_FINGERPRINT_MISMATCH");
  if (chain?.guards?.humanReviewRequired !== true) reasons.push("HUMAN_REVIEW_REQUIRED");
  if (chain?.guards?.automaticExecutionForbidden !== true) reasons.push("AUTOMATIC_EXECUTION_GUARD_REQUIRED");
  if (chain?.guards?.websiteDesignerMutationForbidden !== true) reasons.push("WEBSITE_DESIGNER_GUARD_REQUIRED");
  return { certified: reasons.length === 0, reasons, executableCount: 0, automaticWriteCount: 0 };
}

module.exports = { certifyDecisionPacketSource, buildHumanDecisionChain, certifyHumanDecisionChain };
