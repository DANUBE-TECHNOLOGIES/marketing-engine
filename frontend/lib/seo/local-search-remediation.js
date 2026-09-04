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

function publicationState(publication) {
  if (publication == null) return "unknown";

  const explicitState = String(publication?.state || "").trim().toLowerCase();
  if (["no-site", "missing", "absent"].includes(explicitState) || publication?.hasSite === false) {
    return "no-site";
  }

  const site = Object.prototype.hasOwnProperty.call(publication || {}, "site")
    ? publication.site
    : publication;

  if (site == null) return "no-site";

  const status = String(site?.status || publication?.status || "").trim().toLowerCase();
  const publishedAt = site?.publishedAt ?? publication?.publishedAt ?? null;
  const published = site?.published ?? publication?.published;

  if (status === "published" || publishedAt || published === true) return "published";
  if (["draft", "unpublished", "inactive"].includes(status) || published === false) return "unpublished";

  return "unknown";
}

export function buildLocalSearchRemediation({ agencyKey = null, measurement = null, publication = null } = {}) {
  const key = normalizeAgencyKey(agencyKey);
  const assessment = measurement?.assessment || measurement || {};
  const status = assessment.status || "no-data";
  const confidence = assessment.confidence || "none";
  const sitePublicationState = publicationState(publication);

  let actionType = "collect-data";
  let recommendation = assessment.recommendation || "collect-data";

  if (sitePublicationState === "no-site") {
    actionType = "site-provisioning-check";
    recommendation = "provision-mini-site-before-seo-remediation";
  } else if (sitePublicationState === "unpublished") {
    actionType = "site-publication-check";
    recommendation = "publish-or-confirm-intent-before-seo-remediation";
  } else if (confidence === "usable") {
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
    publicationState: sitePublicationState,
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
