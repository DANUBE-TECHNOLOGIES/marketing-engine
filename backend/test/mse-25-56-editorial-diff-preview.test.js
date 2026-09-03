"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildEditorialDiffPreview, certifyEditorialDiffPreview } = require("../src/modules/minisite-semantic-engine/editorial-diff-preview");

function mandate(overrides = {}) {
  return {
    type: "MSE_25_55_EDITORIAL_MANDATE_REPORT", certified: true, readOnly: true, writes: false, publicWrites: false,
    sourceDecisionFingerprint: "decision-fp", sourcePacketFingerprint: "packet-fp",
    summary: { executableCount: 0, automaticWriteCount: 0 },
    mandate: {
      mandateFingerprint: "mandate-fp", siteSlug: "gien", page: "/services",
      constraints: { existingPageOnly: true, pageCreationAllowed: false, publicationAllowed: false, websiteDesignerMutationAllowed: false, humanApprovalRequiredBeforeAnyFutureMutation: true },
    }, ...overrides,
  };
}
function page(overrides = {}) { return { exists: true, siteSlug: "gien", page: "/services", pageIdentity: "page-123", title: "Billetterie et vols à Gien", introduction: "Votre agence vous accompagne pour vos billets.", manualEditorialContent: false, ...overrides }; }
function proposal(overrides = {}) { return { siteSlug: "gien", page: "/services", title: "Billetterie et vols à Gien", introduction: "Votre agence de voyages à Gien vous accompagne pour vos billets d’avion et vos itinéraires.", ...overrides }; }

test("certified mandate produces human-reviewable diff without execution", () => {
  const preview = buildEditorialDiffPreview({ mandateReport: mandate(), currentPage: page(), proposal: proposal() });
  const certification = certifyEditorialDiffPreview(preview);
  assert.equal(certification.certified, true);
  assert.deepEqual(preview.changedFields, ["introduction"]);
  assert.equal(preview.policy.previewOnly, true);
  assert.equal(preview.policy.executable, false);
  assert.equal(preview.policy.automaticWrite, false);
  assert.equal(preview.policy.websiteDesignerMutationAllowed, false);
  assert.equal(preview.nextStep, "HUMAN_REVIEW_EDITORIAL_DIFF");
});

test("missing existing page fails closed", () => {
  assert.throws(() => buildEditorialDiffPreview({ mandateReport: mandate(), currentPage: page({ exists: false }), proposal: proposal() }), /EXISTING_PAGE_REQUIRED/);
});

test("page identity mismatch fails closed", () => {
  assert.throws(() => buildEditorialDiffPreview({ mandateReport: mandate(), currentPage: page({ page: "/other" }), proposal: proposal({ page: "/other" }) }), /PAGE_IDENTITY_MISMATCH/);
});

test("manual editorial content cannot be replaced by preview", () => {
  assert.throws(() => buildEditorialDiffPreview({ mandateReport: mandate(), currentPage: page({ manualEditorialContent: true }), proposal: proposal({ replaceManualContent: true }) }), /MANUAL_CONTENT_REPLACEMENT_FORBIDDEN/);
});

test("tampered executable preview fails certification", () => {
  const preview = buildEditorialDiffPreview({ mandateReport: mandate(), currentPage: page(), proposal: proposal() });
  preview.policy.executable = true;
  preview.policy.websiteDesignerMutationAllowed = true;
  const certification = certifyEditorialDiffPreview(preview);
  assert.equal(certification.certified, false);
  assert.ok(certification.reasons.includes("WRITE_OR_EXECUTION_FORBIDDEN"));
  assert.ok(certification.reasons.includes("PUBLIC_MUTATION_FORBIDDEN"));
});
