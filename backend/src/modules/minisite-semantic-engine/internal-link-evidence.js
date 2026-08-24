"use strict";

const crypto = require("node:crypto");

const SOURCE_INTENTS_BY_TARGET = Object.freeze({
  commitments: ["agency", "services", "contact"],
});

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}
function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function uniqueBySlug(items = []) {
  const seen = new Set();
  return items.filter((item) => {
    const slug = String(item?.pageSlug || "");
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function sourceCandidates(agency = {}, targetIntent = "commitments") {
  const preferredIntents = SOURCE_INTENTS_BY_TARGET[targetIntent] || [];
  const candidates = [];
  for (const intentKey of preferredIntents) {
    const row = (agency.coverage || []).find((coverage) => coverage.intentKey === intentKey);
    if (!row?.bestPageSlug) continue;
    candidates.push({
      sourceIntent: intentKey,
      pageSlug: row.bestPageSlug,
      status: row.status,
      intentScore: Number(row.bestScore || 0),
      localityScore: Number(row.bestLocalityScore || 0),
      managedRoute: row.bestPageManagedRoute === true,
      writeEligible: row.bestPageWriteEligible !== false,
      contextualReason: `${intentKey}-to-${targetIntent}`,
    });
  }
  return uniqueBySlug(candidates).sort((a, b) => {
    const aRank = a.sourceIntent === "services" ? 3 : a.sourceIntent === "agency" ? 2 : 1;
    const bRank = b.sourceIntent === "services" ? 3 : b.sourceIntent === "agency" ? 2 : 1;
    return bRank - aRank || b.intentScore - a.intentScore || a.pageSlug.localeCompare(b.pageSlug, "fr");
  });
}

function buildInternalLinkEvidence(preview = {}, actionPlan = {}) {
  if (preview.readOnly !== true || preview.writes !== false || actionPlan.readOnly !== true || actionPlan.writes !== false) {
    const error = new Error("Internal-link evidence requires read-only SEO sources.");
    error.code = "MSE_25_47_LINK_EVIDENCE_UNSAFE_SOURCE";
    throw error;
  }

  const items = [];
  for (const orphan of actionPlan.orphanActions || []) {
    const agency = (preview.agencies || []).find((row) => String(row.site?.slug) === String(orphan.siteSlug));
    if (!agency) continue;
    const targetCoverage = (agency.coverage || []).find((row) => row.bestPageSlug === orphan.pageSlug && row.intentKey === "commitments")
      || (agency.coverage || []).find((row) => row.intentKey === "commitments");
    const candidates = sourceCandidates(agency, "commitments");
    const eligibleCandidates = candidates.filter((row) => !row.managedRoute && row.writeEligible);
    items.push({
      siteSlug: orphan.siteSlug,
      agencyId: orphan.agencyId,
      city: orphan.city,
      targetPageSlug: orphan.pageSlug,
      targetIntent: "commitments",
      targetCoverageStatus: targetCoverage?.status || null,
      targetIntentScore: Number(targetCoverage?.bestScore || 0),
      targetLocalityScore: Number(targetCoverage?.bestLocalityScore || 0),
      sourceCandidates: candidates,
      preferredSource: eligibleCandidates[0] || null,
      evidenceComplete: eligibleCandidates.length > 0,
      decision: eligibleCandidates.length > 0 ? "contextual-link-candidate" : "manual-navigation-review",
      automaticWrite: false,
    });
  }

  const result = {
    type: "mse-25.47-internal-link-evidence",
    sourcePlanFingerprint: preview.planFingerprint,
    sourceActionPlanFingerprint: actionPlan.actionPlanFingerprint,
    readOnly: true,
    writes: false,
    destructive: false,
    policy: {
      evidenceOnly: true,
      noAutomaticInternalLinks: true,
      noAutomaticPageCreation: true,
      noAutomaticPublication: true,
      automaticWrites: false,
    },
    items,
    summary: {
      orphanCount: items.length,
      evidenceCompleteCount: items.filter((row) => row.evidenceComplete).length,
      contextualLinkCandidateCount: items.filter((row) => row.decision === "contextual-link-candidate").length,
      manualNavigationReviewCount: items.filter((row) => row.decision === "manual-navigation-review").length,
      automaticWriteCount: 0,
    },
  };

  return { ...result, evidenceFingerprint: fingerprint(result) };
}

module.exports = { SOURCE_INTENTS_BY_TARGET, buildInternalLinkEvidence, sourceCandidates, fingerprint };
