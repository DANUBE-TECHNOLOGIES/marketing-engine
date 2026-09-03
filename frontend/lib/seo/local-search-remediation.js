const SAFE_SURFACES = Object.freeze([
  "home",
  "ticketing",
  "groups",
  "business-travel",
  "inspiration",
  "published-cms",
]);

const PRIORITY_GUIDANCE = Object.freeze({
  dax: "visibility-no-clicks",
  "bois-colombes": "exposure-gap",
  maurepas: "exposure-gap",
  lamorlaye: "verify-indexation-first",
  ozoir: "verify-indexation-first",
  nevers: "preserve-relative-positive-signal",
  gien: "preserve-relative-positive-signal",
});

function normalizeAgencyKey(value) {
  return String(value || "").trim().toLowerCase();
}

export function buildLocalSearchRemediation({ agencyKey = null, measurement = null } = {}) {
  const key = normalizeAgencyKey(agencyKey);
  const assessment = measurement?.assessment || measurement || {};
  const status = assessment.status || "no-data";
  const confidence = assessment.confidence || "none";

  let actionType = "collect-data";
  let recommendation = assessment.recommendation || "collect-data";

  if (confidence === "usable") {
    if (status === "visibility-no-clicks" || status === "low-ctr") {
      actionType = "serp-snippet-review";
    } else if (status === "weak-position") {
      actionType = "existing-page-relevance";
    } else if (status === "no-impressions") {
      actionType = "indexation-and-intent-check";
    } else if (status === "healthy" || status === "improving") {
      actionType = "preserve-and-monitor";
    }
  } else if (status === "no-impressions" || PRIORITY_GUIDANCE[key] === "verify-indexation-first") {
    actionType = "indexation-and-intent-check";
    recommendation = "verify-indexation-and-query-target";
  } else if (confidence === "low") {
    actionType = "collect-more-data";
    recommendation = "collect-more-data";
  }

  return {
    agencyKey: key || null,
    status,
    confidence,
    priorityGuidance: PRIORITY_GUIDANCE[key] || null,
    actionType,
    recommendation,
    allowedSurfaces: SAFE_SURFACES,
    createDoorwayPageAllowed: false,
    automatedPublicChangeAllowed: false,
    googleWriteAllowed: false,
    requiresHumanReview: true,
  };
}

export function buildLocalSearchRemediationPlan(items = []) {
  return items.map((item) => buildLocalSearchRemediation(item));
}
