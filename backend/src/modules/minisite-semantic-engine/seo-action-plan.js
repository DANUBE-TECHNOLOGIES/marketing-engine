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

function buildSeoActionPlan(qualification = {}) {
  if (qualification.readOnly !== true || qualification.writes !== false || qualification.policy?.automaticWrites !== false) {
    const error = new Error("SEO action planning requires a safe read-only qualification report.");
    error.code = "MSE_25_47_ACTION_PLAN_UNSAFE_SOURCE";
    throw error;
  }

  const gapActions = (qualification.gaps || []).map((gap) => ({
    signalType: "semantic-gap",
    siteSlug: gap.siteSlug,
    agencyId: gap.agencyId,
    city: gap.city,
    intentKey: gap.intentKey,
    pageSlug: gap.bestPageSlug,
    disposition: gap.disposition,
    action: gap.disposition === "observe" ? "monitor-only" : "review-before-any-change",
    rationale: gap.residualSuppressionReason || gap.gapReason || "semantic-signal",
    automaticWrite: false,
  }));

  const orphanActions = (qualification.orphans || []).map((orphan) => ({
    signalType: "semantic-orphan",
    siteSlug: orphan.siteSlug,
    agencyId: orphan.agencyId,
    city: orphan.city,
    pageSlug: orphan.pageSlug,
    disposition: "human-review",
    action: "review-internal-linking-context",
    rationale: "published-page-has-no-topic-graph-inbound-context",
    evidenceRequired: ["page-purpose", "existing-navigation", "contextual-link-source"],
    automaticWrite: false,
  }));

  const cannibalizationActions = (qualification.cannibalization || []).map((conflict) => ({
    signalType: "cannibalization",
    siteSlug: conflict.siteSlug,
    agencyId: conflict.agencyId,
    city: conflict.city,
    intentKey: conflict.intentKey,
    severity: conflict.severity,
    blocking: conflict.blocking === true,
    pages: conflict.pages || [],
    disposition: conflict.blocking ? "human-review" : "observe",
    action: conflict.blocking ? "decide-canonical-intent-owner" : "monitor-overlap",
    rationale: conflict.blocking ? "blocking-intent-conflict" : "non-blocking-semantic-overlap",
    automaticWrite: false,
  }));

  const actionable = [
    ...orphanActions,
    ...cannibalizationActions.filter((row) => row.blocking),
    ...gapActions.filter((row) => row.disposition !== "observe"),
  ];

  const result = {
    type: "mse-25.47-seo-action-plan",
    sourceQualificationFingerprint: qualification.qualificationFingerprint,
    readOnly: true,
    writes: false,
    destructive: false,
    policy: {
      observationsAreNotWriteInstructions: true,
      internalLinksRequireContextReview: true,
      nonBlockingCannibalizationIsObservedOnly: true,
      noAutomaticPageCreation: true,
      noAutomaticPublication: true,
      automaticWrites: false,
    },
    gapActions,
    orphanActions,
    cannibalizationActions,
    actionable,
    summary: {
      monitoredGapCount: gapActions.filter((row) => row.action === "monitor-only").length,
      orphanReviewCount: orphanActions.length,
      cannibalizationMonitorCount: cannibalizationActions.filter((row) => !row.blocking).length,
      blockingCannibalizationReviewCount: cannibalizationActions.filter((row) => row.blocking).length,
      actionableReviewCount: actionable.length,
      automaticWriteCount: 0,
    },
  };

  return { ...result, actionPlanFingerprint: fingerprint(result) };
}

module.exports = { buildSeoActionPlan, fingerprint };
