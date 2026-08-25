"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEditorialMandatePreview, certifyEditorialMandatePreview } = require("../src/modules/minisite-semantic-engine/editorial-mandate-preview");

function source(decision = "REFINE_EXISTING_PAGE", overrides = {}) {
  return {
    type: "MSE_25_54_HUMAN_SEO_REVIEW_DECISION_REPORT",
    certified: true, readOnly: true, writes: false, publicWrites: false,
    sourcePacketFingerprint: "packet-fp", chainFingerprint: "chain-fp",
    summary: { executableCount: 0, automaticWriteCount: 0 },
    decision: {
      humanDecision: true, reviewOnly: true, executable: false, automaticWrite: false,
      decision, nextStep: decision === "REFINE_EXISTING_PAGE" ? "PREPARE_NON_EXECUTABLE_EDITORIAL_MANDATE" : "NO_CHANGE_REQUESTED",
      decisionFingerprint: "decision-fp", sourcePacketFingerprint: "packet-fp",
      siteSlug: "gien", intent: "ticketing", query: "billet avion gien", page: "/services",
      priority: "HIGH_REVIEW_PRIORITY", priorityScore: 90, evidenceLevel: "HIGH", lifecycleStatus: "PERSISTING",
    }, ...overrides,
  };
}

test("human REFINE_EXISTING_PAGE becomes a review-only editorial mandate", () => {
  const mandate = buildEditorialMandatePreview({ decisionReport: source() });
  const certification = certifyEditorialMandatePreview(mandate);
  assert.equal(certification.certified, true);
  assert.equal(mandate.objective, "REFINE_EXISTING_PAGE");
  assert.equal(mandate.constraints.existingPageOnly, true);
  assert.equal(mandate.constraints.pageCreationAllowed, false);
  assert.equal(mandate.constraints.publicationAllowed, false);
  assert.equal(mandate.constraints.websiteDesignerMutationAllowed, false);
  assert.equal(mandate.constraints.automaticContentWriteAllowed, false);
  assert.equal(mandate.constraints.automaticSeoWriteAllowed, false);
  assert.equal(mandate.constraints.humanApprovalRequiredBeforeAnyFutureMutation, true);
  assert.equal(mandate.executable, false);
  assert.equal(mandate.automaticWrite, false);
  assert.equal(mandate.nextStep, "PREPARE_HUMAN_REVIEWABLE_CONTENT_DIFF");
});

test("KEEP_AS_IS cannot create an editorial mandate", () => {
  assert.throws(() => buildEditorialMandatePreview({ decisionReport: source("KEEP_AS_IS") }), /DECISION_NOT_ELIGIBLE/);
});

test("unsafe or writable source fails closed", () => {
  assert.throws(() => buildEditorialMandatePreview({ decisionReport: source("REFINE_EXISTING_PAGE", { writes: true }) }), /SOURCE_CERTIFICATION_FAILED/);
});

test("tampering mandate into an executable mutation fails certification", () => {
  const mandate = buildEditorialMandatePreview({ decisionReport: source() });
  mandate.executable = true;
  mandate.constraints.websiteDesignerMutationAllowed = true;
  const certification = certifyEditorialMandatePreview(mandate);
  assert.equal(certification.certified, false);
  assert.ok(certification.reasons.includes("EXECUTION_FORBIDDEN"));
  assert.ok(certification.reasons.includes("WEBSITE_DESIGNER_MUTATION_FORBIDDEN"));
});
