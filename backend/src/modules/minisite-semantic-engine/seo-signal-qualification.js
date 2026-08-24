"use strict";

const crypto = require("node:crypto");
const { buildConsolidatedExecutionPlan } = require("./consolidated-execution-plan");
const { buildResidualExecutionPlan } = require("./residual-execution-plan");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function residualDecisionFor(residualPlan, siteSlug, intentKey) {
  const site = (residualPlan.sites || []).find((row) => String(row.siteSlug) === String(siteSlug));
  for (const page of site?.pages || []) {
    const eligible = (page.eligibleSections || []).find((row) => row.intentKey === intentKey);
    if (eligible) return { executable: true, pageSlug: page.pageSlug, reason: "residual-eligible", suppressionReason: null };
    const suppressed = (page.suppressedSections || []).find((row) => row.intentKey === intentKey);
    if (suppressed) return { executable: false, pageSlug: page.pageSlug, reason: "residual-suppressed", suppressionReason: suppressed.suppressionReason || null };
  }
  return { executable: false, pageSlug: null, reason: "not-in-consolidated-write-plan", suppressionReason: null };
}

function classifyGap(agency, coverage, residualPlan) {
  const decision = residualDecisionFor(residualPlan, agency.site?.slug, coverage.intentKey);
  let disposition = "observe";
  let evidenceGate = "none";

  if (coverage.bestPageManagedRoute) {
    disposition = "managed-route-review";
    evidenceGate = "managed-route-human-review";
  } else if (decision.executable) {
    disposition = "candidate-for-later-execution";
    evidenceGate = "sealed-write-intent-required";
  } else if (!coverage.bestPageSlug) {
    disposition = "human-review";
    evidenceGate = "search-demand-and-architecture-evidence-required";
  } else if (["home-secondary-fill-prohibited", "intent-covered-elsewhere", "intent-covered-on-target-page", "managed-route-preferred"].includes(decision.suppressionReason)) {
    disposition = "observe";
    evidenceGate = "no-write-under-current-architecture";
  } else {
    disposition = "human-review";
    evidenceGate = "manual-semantic-review-required";
  }

  return {
    siteSlug: agency.site?.slug || null,
    agencyId: agency.site?.agencyId || null,
    city: agency.site?.city || null,
    intentKey: coverage.intentKey,
    label: coverage.label,
    commercial: coverage.commercial === true,
    priority: coverage.priority,
    gapReason: coverage.gapReason,
    bestPageSlug: coverage.bestPageSlug,
    bestScore: Number(coverage.bestScore || 0),
    bestLocalityScore: Number(coverage.bestLocalityScore || 0),
    bestPageManagedRoute: coverage.bestPageManagedRoute === true,
    bestPageWriteEligible: coverage.bestPageWriteEligible !== false,
    residualExecutable: decision.executable,
    residualSuppressionReason: decision.suppressionReason,
    disposition,
    evidenceGate,
    automaticWrite: false,
  };
}

function qualifySeoSignals(preview = {}) {
  if (preview.readOnly !== true || preview.writes !== false || preview.policy?.automaticWrites !== false) {
    const error = new Error("SEO signal qualification requires a safe read-only preview.");
    error.code = "MSE_25_47_QUALIFICATION_UNSAFE_SOURCE";
    throw error;
  }

  const consolidatedPlan = buildConsolidatedExecutionPlan(preview);
  const residualPlan = buildResidualExecutionPlan(preview, consolidatedPlan);
  const gaps = [];
  const orphans = [];
  const cannibalization = [];

  for (const agency of preview.agencies || []) {
    for (const coverage of agency.coverage || []) {
      if (coverage.status === "gap") gaps.push(classifyGap(agency, coverage, residualPlan));
    }
    for (const pageSlug of agency.topicGraph?.orphanPages || []) {
      orphans.push({ siteSlug: agency.site?.slug || null, agencyId: agency.site?.agencyId || null, city: agency.site?.city || null, pageSlug, disposition: "human-review", evidenceGate: "internal-linking-context-review", automaticWrite: false });
    }
    for (const conflict of agency.cannibalization || []) {
      cannibalization.push({ siteSlug: agency.site?.slug || null, agencyId: agency.site?.agencyId || null, city: agency.site?.city || null, intentKey: conflict.intentKey, severity: conflict.severity, blocking: conflict.blocking === true, pages: conflict.pages || [], disposition: conflict.blocking ? "human-review" : "observe", evidenceGate: conflict.blocking ? "canonical-target-decision-required" : "monitor-non-blocking-overlap", automaticWrite: false });
    }
  }

  const result = {
    type: "mse-25.47-seo-signal-qualification",
    sourcePlanFingerprint: preview.planFingerprint,
    readOnly: true,
    writes: false,
    destructive: false,
    policy: {
      semanticGapsAreNotWriteInstructions: true,
      residualPlanControlsExecutionEligibility: true,
      noAutomaticPageCreation: true,
      noAutomaticPublication: true,
      automaticWrites: false,
    },
    residualSummary: residualPlan.summary,
    gaps,
    orphans,
    cannibalization,
    summary: {
      gapCount: gaps.length,
      observeGapCount: gaps.filter((row) => row.disposition === "observe").length,
      humanReviewGapCount: gaps.filter((row) => row.disposition === "human-review").length,
      managedRouteReviewGapCount: gaps.filter((row) => row.disposition === "managed-route-review").length,
      laterExecutionCandidateCount: gaps.filter((row) => row.disposition === "candidate-for-later-execution").length,
      residualExecutablePageCount: Number(residualPlan.summary?.executablePageCount || 0),
      residualEligibleSectionCount: Number(residualPlan.summary?.eligibleSectionCount || 0),
      orphanCount: orphans.length,
      cannibalizationCount: cannibalization.length,
      blockingCannibalizationCount: cannibalization.filter((row) => row.blocking).length,
      automaticWriteCount: 0,
    },
  };
  return { ...result, qualificationFingerprint: fingerprint(result) };
}

module.exports = { classifyGap, qualifySeoSignals, residualDecisionFor, fingerprint };
