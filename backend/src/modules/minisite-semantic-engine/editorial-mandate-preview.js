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

function certifySourceDecisionReport(report) {
  const reasons = [];
  if (!report || report.type !== "MSE_25_54_HUMAN_SEO_REVIEW_DECISION_REPORT") reasons.push("INVALID_SOURCE_TYPE");
  if (report?.certified !== true && report?.certification?.certified !== true) reasons.push("SOURCE_NOT_CERTIFIED");
  if (report?.readOnly !== true) reasons.push("SOURCE_READ_ONLY_REQUIRED");
  if (report?.writes !== false) reasons.push("SOURCE_WRITES_FORBIDDEN");
  if (report?.publicWrites !== false) reasons.push("SOURCE_PUBLIC_WRITES_FORBIDDEN");
  if (Number(report?.summary?.executableCount || 0) !== 0) reasons.push("SOURCE_EXECUTION_FORBIDDEN");
  if (Number(report?.summary?.automaticWriteCount || 0) !== 0) reasons.push("SOURCE_AUTOMATIC_WRITE_FORBIDDEN");
  if (!report?.sourcePacketFingerprint) reasons.push("SOURCE_PACKET_FINGERPRINT_REQUIRED");
  if (!report?.chainFingerprint) reasons.push("SOURCE_CHAIN_FINGERPRINT_REQUIRED");
  return { certified: reasons.length === 0, reasons };
}

function buildEditorialMandatePreview({ decisionReport } = {}) {
  const sourceCertification = certifySourceDecisionReport(decisionReport);
  if (!sourceCertification.certified) throw new Error(`MSE_25_55_SOURCE_CERTIFICATION_FAILED:${sourceCertification.reasons.join(",")}`);

  const decision = decisionReport.decision;
  if (!decision || decision.humanDecision !== true || decision.reviewOnly !== true || decision.executable !== false || decision.automaticWrite !== false) {
    throw new Error("MSE_25_55_UNSAFE_HUMAN_DECISION");
  }
  if (decision.decision !== "REFINE_EXISTING_PAGE" || decision.nextStep !== "PREPARE_NON_EXECUTABLE_EDITORIAL_MANDATE") {
    throw new Error(`MSE_25_55_DECISION_NOT_ELIGIBLE:${decision.decision || "null"}`);
  }

  const mandate = {
    type: "MSE_25_55_EDITORIAL_MANDATE_PREVIEW",
    siteSlug: decision.siteSlug,
    intent: decision.intent,
    query: decision.query,
    page: decision.page,
    priority: decision.priority,
    priorityScore: decision.priorityScore,
    evidenceLevel: decision.evidenceLevel,
    lifecycleStatus: decision.lifecycleStatus,
    sourceDecisionFingerprint: decision.decisionFingerprint,
    sourcePacketFingerprint: decision.sourcePacketFingerprint,
    sourceDecisionChainFingerprint: decisionReport.chainFingerprint,
    objective: "REFINE_EXISTING_PAGE",
    requestedEditorialWork: [
      "REVIEW_EXISTING_PAGE_AGAINST_PERSISTENT_SEARCH_DEMAND",
      "PROPOSE_MINIMAL_CONTENT_REFINEMENT",
      "PRESERVE_MANUAL_EDITORIAL_CONTENT",
      "PRESERVE_EXISTING_PAGE_IDENTITY_AND_URL",
    ],
    constraints: {
      existingPageOnly: true,
      pageCreationAllowed: false,
      publicationAllowed: false,
      websiteDesignerMutationAllowed: false,
      automaticContentWriteAllowed: false,
      automaticSeoWriteAllowed: false,
      humanApprovalRequiredBeforeAnyFutureMutation: true,
    },
    reviewOnly: true,
    executable: false,
    automaticWrite: false,
    writes: false,
    publicWrites: false,
    nextStep: "PREPARE_HUMAN_REVIEWABLE_CONTENT_DIFF",
  };
  mandate.mandateFingerprint = fingerprint(mandate);
  return mandate;
}

function certifyEditorialMandatePreview(mandate) {
  const reasons = [];
  if (!mandate || mandate.type !== "MSE_25_55_EDITORIAL_MANDATE_PREVIEW") reasons.push("INVALID_TYPE");
  if (mandate?.objective !== "REFINE_EXISTING_PAGE") reasons.push("INVALID_OBJECTIVE");
  if (mandate?.constraints?.existingPageOnly !== true) reasons.push("EXISTING_PAGE_ONLY_REQUIRED");
  if (mandate?.constraints?.pageCreationAllowed !== false) reasons.push("PAGE_CREATION_FORBIDDEN");
  if (mandate?.constraints?.publicationAllowed !== false) reasons.push("PUBLICATION_FORBIDDEN");
  if (mandate?.constraints?.websiteDesignerMutationAllowed !== false) reasons.push("WEBSITE_DESIGNER_MUTATION_FORBIDDEN");
  if (mandate?.constraints?.automaticContentWriteAllowed !== false) reasons.push("CONTENT_WRITE_FORBIDDEN");
  if (mandate?.constraints?.automaticSeoWriteAllowed !== false) reasons.push("SEO_WRITE_FORBIDDEN");
  if (mandate?.constraints?.humanApprovalRequiredBeforeAnyFutureMutation !== true) reasons.push("HUMAN_APPROVAL_REQUIRED");
  if (mandate?.reviewOnly !== true) reasons.push("REVIEW_ONLY_REQUIRED");
  if (mandate?.executable !== false) reasons.push("EXECUTION_FORBIDDEN");
  if (mandate?.automaticWrite !== false || mandate?.writes !== false || mandate?.publicWrites !== false) reasons.push("WRITE_FORBIDDEN");
  if (!mandate?.sourceDecisionFingerprint || !mandate?.sourcePacketFingerprint || !mandate?.sourceDecisionChainFingerprint) reasons.push("SOURCE_CHAIN_REQUIRED");
  return { certified: reasons.length === 0, reasons, executableCount: 0, automaticWriteCount: 0 };
}

module.exports = { buildEditorialMandatePreview, certifyEditorialMandatePreview, certifySourceDecisionReport, fingerprint };
