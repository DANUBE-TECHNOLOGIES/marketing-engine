"use strict";

const INCIDENT_DEFINITIONS = Object.freeze({
  PUBLIC_HTTP_ERROR: { code: "HTTP_ERROR", severity: "P0", action: "CHECK_PUBLIC_ROUTE", blocking: true },
  PUBLIC_ROBOTS_TXT_BLOCKED: { code: "ROBOTS_RUNTIME_BLOCK", severity: "P0", action: "REVIEW_ROBOTS_POLICY", blocking: true },
  PUBLIC_META_NOINDEX: { code: "PUBLIC_NOINDEX", severity: "P0", action: "REVIEW_RENDERED_ROBOTS_META", blocking: true },
  PUBLIC_X_ROBOTS_NOINDEX: { code: "PUBLIC_X_ROBOTS_NOINDEX", severity: "P0", action: "REVIEW_HTTP_ROBOTS_HEADER", blocking: true },
  PUBLIC_CANONICAL_MISMATCH: { code: "CANONICAL_RUNTIME_MISMATCH", severity: "P1", action: "REVIEW_RENDERED_CANONICAL", blocking: true },
  PUBLIC_URL_REDIRECTED: { code: "REDIRECT_RUNTIME", severity: "P2", action: "REVIEW_PUBLIC_REDIRECT", blocking: false },
  PUBLIC_FETCH_UNAVAILABLE: { code: "OBSERVATION_UNAVAILABLE", severity: "P3", action: "RETRY_PUBLIC_OBSERVATION", blocking: false },
});

const LOCAL_REASON_DEFINITIONS = Object.freeze({
  PAGE_NOT_IN_SITEMAP: { code: "SITEMAP_MISSING", severity: "P0", action: "REVIEW_SITEMAP_ELIGIBILITY", blocking: true },
  PAGE_NOT_INDEXABLE: { code: "LOCAL_NOINDEX", severity: "P0", action: "REVIEW_PAGE_INDEXABILITY", blocking: true },
  CANONICAL_MISMATCH: { code: "CANONICAL_CONTRACT_MISMATCH", severity: "P1", action: "REVIEW_CANONICAL_CONTRACT", blocking: true },
  ROBOTS_BLOCKED: { code: "LOCAL_ROBOTS_BLOCK", severity: "P0", action: "REVIEW_LOCAL_ROBOTS_POLICY", blocking: true },
});

const SEVERITY_WEIGHT = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3 });

function normalizeUrl(value) {
  try {
    const url = new URL(String(value || ""));
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/g, "");
    return url.toString().replace(/\/$/, url.pathname === "/" ? "/" : "");
  } catch (_error) {
    return String(value || "").trim() || null;
  }
}

function incidentId({ code, url }) {
  return `${code}:${normalizeUrl(url) || "unknown"}`;
}

function buildIncident({ definition, source, reason, url, agencySiteId = null, siteSlug = null, details = null }) {
  if (!definition) return null;
  return {
    id: incidentId({ code: definition.code, url }),
    code: definition.code,
    severity: definition.severity,
    blocking: definition.blocking === true,
    source,
    sourceReason: reason,
    url: normalizeUrl(url),
    agencySiteId,
    siteSlug,
    recommendedAction: definition.action,
    details: details || null,
    autoRemediationEligible: false,
    requiresHumanReview: true,
  };
}

function publicIncidents(publicAudit) {
  return (publicAudit?.observations || []).map((observation) => {
    const definition = INCIDENT_DEFINITIONS[observation?.reason];
    return buildIncident({
      definition,
      source: "PUBLIC_HTTP_OBSERVATION",
      reason: observation?.reason,
      url: observation?.expectedUrl,
      details: definition ? {
        status: observation?.status ?? null,
        finalUrl: observation?.finalUrl || null,
        publicCanonical: observation?.publicCanonical || null,
        robotsTxtRule: observation?.robotsTxtRule || null,
        fetchError: observation?.fetchError || null,
      } : null,
    });
  }).filter(Boolean);
}

function localIncidents(coverage) {
  const pages = coverage?.pages || coverage?.pageDiagnostics || [];
  return pages.flatMap((page) => {
    const reasons = [page?.reason, ...(page?.reasons || [])].filter(Boolean);
    return [...new Set(reasons)].map((reason) => buildIncident({
      definition: LOCAL_REASON_DEFINITIONS[reason],
      source: "LOCAL_INDEXATION_CONTRACT",
      reason,
      url: page?.url || page?.publicUrl || page?.canonicalUrl,
      agencySiteId: page?.agencySiteId || null,
      siteSlug: page?.siteSlug || null,
      details: LOCAL_REASON_DEFINITIONS[reason] ? {
        inSitemap: page?.inSitemap ?? null,
        indexable: page?.indexable ?? null,
        canonicalUrl: page?.canonicalUrl || null,
      } : null,
    })).filter(Boolean);
  });
}

function dedupeIncidents(items) {
  const byId = new Map();
  for (const item of items) {
    const previous = byId.get(item.id);
    if (!previous || SEVERITY_WEIGHT[item.severity] < SEVERITY_WEIGHT[previous.severity]) byId.set(item.id, item);
  }
  return [...byId.values()];
}

function buildIndexationIncidentQueue({ coverage = null, publicAudit = null } = {}) {
  const incidents = dedupeIncidents([...localIncidents(coverage), ...publicIncidents(publicAudit)])
    .sort((a, b) => (SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity]) || String(a.url).localeCompare(String(b.url)) || a.code.localeCompare(b.code));
  const count = (severity) => incidents.filter((item) => item.severity === severity).length;
  return {
    version: "mse-25.72",
    mode: "READ_ONLY_DIAGNOSTIC_QUEUE",
    summary: {
      incidentCount: incidents.length,
      blockingCount: incidents.filter((item) => item.blocking).length,
      p0Count: count("P0"),
      p1Count: count("P1"),
      p2Count: count("P2"),
      p3Count: count("P3"),
      requiresHumanReviewCount: incidents.length,
      autoRemediationEligibleCount: 0,
    },
    incidents,
    invariants: {
      googleWrites: false,
      sitemapSubmission: false,
      pageCreation: false,
      pagePublication: false,
      websiteDesignerMutation: false,
      automaticRemediation: false,
    },
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  INCIDENT_DEFINITIONS,
  LOCAL_REASON_DEFINITIONS,
  buildIndexationIncidentQueue,
  buildIncident,
  dedupeIncidents,
};
