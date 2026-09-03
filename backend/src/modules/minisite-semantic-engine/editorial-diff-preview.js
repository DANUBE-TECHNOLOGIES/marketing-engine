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

function certifyMandateReport(report) {
  const reasons = [];
  if (!report || report.type !== "MSE_25_55_EDITORIAL_MANDATE_REPORT") reasons.push("INVALID_SOURCE_TYPE");
  if (report?.certified !== true) reasons.push("SOURCE_NOT_CERTIFIED");
  if (report?.readOnly !== true || report?.writes !== false || report?.publicWrites !== false) reasons.push("SOURCE_WRITE_POLICY_INVALID");
  if (Number(report?.summary?.executableCount || 0) !== 0) reasons.push("SOURCE_EXECUTION_FORBIDDEN");
  if (Number(report?.summary?.automaticWriteCount || 0) !== 0) reasons.push("SOURCE_AUTOMATIC_WRITE_FORBIDDEN");
  if (report?.mandate?.constraints?.existingPageOnly !== true) reasons.push("EXISTING_PAGE_ONLY_REQUIRED");
  if (report?.mandate?.constraints?.pageCreationAllowed !== false) reasons.push("PAGE_CREATION_FORBIDDEN");
  if (report?.mandate?.constraints?.publicationAllowed !== false) reasons.push("PUBLICATION_FORBIDDEN");
  if (report?.mandate?.constraints?.websiteDesignerMutationAllowed !== false) reasons.push("WEBSITE_DESIGNER_MUTATION_FORBIDDEN");
  if (report?.mandate?.constraints?.humanApprovalRequiredBeforeAnyFutureMutation !== true) reasons.push("HUMAN_APPROVAL_REQUIRED");
  return { certified: reasons.length === 0, reasons };
}

function normalizeText(value) { return typeof value === "string" ? value.trim() : ""; }

function buildEditorialDiffPreview({ mandateReport, currentPage, proposal } = {}) {
  const sourceCertification = certifyMandateReport(mandateReport);
  if (!sourceCertification.certified) throw new Error(`MSE_25_56_SOURCE_CERTIFICATION_FAILED:${sourceCertification.reasons.join(",")}`);
  if (!currentPage || currentPage.exists !== true) throw new Error("MSE_25_56_EXISTING_PAGE_REQUIRED");
  if (currentPage.siteSlug !== mandateReport.mandate.siteSlug || currentPage.page !== mandateReport.mandate.page) throw new Error("MSE_25_56_PAGE_IDENTITY_MISMATCH");
  if (!proposal || proposal.page !== currentPage.page || proposal.siteSlug !== currentPage.siteSlug) throw new Error("MSE_25_56_PROPOSAL_IDENTITY_MISMATCH");

  const before = {
    title: normalizeText(currentPage.title),
    introduction: normalizeText(currentPage.introduction),
  };
  const after = {
    title: normalizeText(proposal.title || currentPage.title),
    introduction: normalizeText(proposal.introduction || currentPage.introduction),
  };
  if (!after.title) throw new Error("MSE_25_56_TITLE_REQUIRED");
  if (!after.introduction) throw new Error("MSE_25_56_INTRODUCTION_REQUIRED");

  const changedFields = Object.keys(before).filter((key) => before[key] !== after[key]);
  if (changedFields.length === 0) throw new Error("MSE_25_56_NO_EDITORIAL_CHANGE");

  const preview = {
    type: "MSE_25_56_EDITORIAL_DIFF_PREVIEW",
    siteSlug: currentPage.siteSlug,
    page: currentPage.page,
    pageIdentity: currentPage.pageIdentity || `${currentPage.siteSlug}:${currentPage.page}`,
    sourceMandateFingerprint: mandateReport.mandate.mandateFingerprint,
    sourceDecisionFingerprint: mandateReport.sourceDecisionFingerprint,
    sourcePacketFingerprint: mandateReport.sourcePacketFingerprint,
    before,
    after,
    changedFields,
    preservation: {
      manualEditorialContentDetected: currentPage.manualEditorialContent === true,
      manualEditorialContentPreserved: currentPage.manualEditorialContent === true ? proposal.replaceManualContent !== true : true,
      urlPreserved: true,
      pageIdentityPreserved: true,
    },
    policy: {
      previewOnly: true,
      humanReviewRequired: true,
      humanApprovalRequiredBeforeMutation: true,
      executable: false,
      automaticWrite: false,
      writes: false,
      publicWrites: false,
      pageCreationAllowed: false,
      publicationAllowed: false,
      websiteDesignerMutationAllowed: false,
    },
    nextStep: "HUMAN_REVIEW_EDITORIAL_DIFF",
  };
  if (!preview.preservation.manualEditorialContentPreserved) throw new Error("MSE_25_56_MANUAL_CONTENT_REPLACEMENT_FORBIDDEN");
  preview.diffFingerprint = fingerprint(preview);
  return preview;
}

function certifyEditorialDiffPreview(preview) {
  const reasons = [];
  if (!preview || preview.type !== "MSE_25_56_EDITORIAL_DIFF_PREVIEW") reasons.push("INVALID_TYPE");
  if (!Array.isArray(preview?.changedFields) || preview.changedFields.length === 0) reasons.push("CHANGE_REQUIRED");
  if (preview?.preservation?.urlPreserved !== true || preview?.preservation?.pageIdentityPreserved !== true) reasons.push("PAGE_IDENTITY_MUST_BE_PRESERVED");
  if (preview?.preservation?.manualEditorialContentPreserved !== true) reasons.push("MANUAL_CONTENT_MUST_BE_PRESERVED");
  if (preview?.policy?.previewOnly !== true || preview?.policy?.humanReviewRequired !== true || preview?.policy?.humanApprovalRequiredBeforeMutation !== true) reasons.push("HUMAN_GATE_REQUIRED");
  if (preview?.policy?.executable !== false || preview?.policy?.automaticWrite !== false || preview?.policy?.writes !== false || preview?.policy?.publicWrites !== false) reasons.push("WRITE_OR_EXECUTION_FORBIDDEN");
  if (preview?.policy?.pageCreationAllowed !== false || preview?.policy?.publicationAllowed !== false || preview?.policy?.websiteDesignerMutationAllowed !== false) reasons.push("PUBLIC_MUTATION_FORBIDDEN");
  return { certified: reasons.length === 0, reasons, executableCount: 0, automaticWriteCount: 0 };
}

module.exports = { buildEditorialDiffPreview, certifyEditorialDiffPreview, certifyMandateReport, fingerprint };
