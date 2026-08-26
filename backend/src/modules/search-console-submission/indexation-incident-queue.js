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
  MISSING_FROM_SITEMAP: { code: "SITEMAP_MISSING", severity: "P0", action: "REVIEW_SITEMAP_ELIGIBILITY", blocking: true },
  NOT_INDEXABLE: { code: "LOCAL_NOINDEX", severity: "P0", action: "REVIEW_PAGE_INDEXABILITY", blocking: true },
  ROBOTS_BLOCKED: { code: "LOCAL_ROBOTS_BLOCK", severity: "P0", action: "REVIEW_LOCAL_ROBOTS_POLICY", blocking: true },
  CANONICAL_MISMATCH: { code: "CANONICAL_CONTRACT_MISMATCH", severity: "P1", action: "REVIEW_CANONICAL_CONTRACT", blocking: true },
});

const SEVERITY_WEIGHT = Object.freeze({ P0: 0, P1: 1, P2: 2, P3: 3 });

function normalizeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.hash = "";
    url.search = "";
    const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/g, "");
    return `${url.protocol}//${url.host}${pathname}`;
  } catch (_error) {
    return raw;
  }
}

function incidentId({ code, url }) { return `${code}:${normalizeUrl(url) || "unknown"}`; }

function buildIncident({ definition, source, reason, url, agencySiteId = null, siteSlug = null, agencyId = null, agencyName = null, details = null }) {
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
    agencyId,
    agencyName,
    recommendedAction: definition.action,
    details: details || null,
    autoRemediationEligible: false,
    requiresHumanReview: true,
  };
}

function publicIncidents(publicAudit) {
  return (publicAudit?.observations || []).map((observation) => buildIncident({
    definition: INCIDENT_DEFINITIONS[observation?.reason],
    source: "PUBLIC_HTTP_OBSERVATION",
    reason: observation?.reason,
    url: observation?.expectedUrl,
    details: INCIDENT_DEFINITIONS[observation?.reason] ? {
      status: observation?.status ?? null,
      finalUrl: observation?.finalUrl || null,
      publicCanonical: observation?.publicCanonical || null,
      robotsTxtRule: observation?.robotsTxtRule || null,
      fetchError: observation?.fetchError || null,
    } : null,
  })).filter(Boolean);
}

function coveragePages(coverage) {
  if (Array.isArray(coverage?.pages)) return coverage.pages;
  if (Array.isArray(coverage?.pageDiagnostics)) return coverage.pageDiagnostics;
  return (coverage?.sites || []).flatMap((site) => (site?.pages || []).map((page) => ({
    ...page,
    siteSlug: page?.siteSlug || site?.siteSlug || null,
    agencySiteId: page?.agencySiteId || site?.siteId || null,
    agencyId: page?.agencyId || site?.agencyId || null,
    agencyName: page?.agencyName || site?.agencyName || null,
  })));
}

function localIncidents(coverage) {
  return coveragePages(coverage).flatMap((page) => {
    const reasons = [page?.reason, ...(page?.reasons || [])].filter(Boolean);
    return [...new Set(reasons)].map((reason) => buildIncident({
      definition: LOCAL_REASON_DEFINITIONS[reason],
      source: "LOCAL_INDEXATION_CONTRACT",
      reason,
      url: page?.url || page?.publicUrl || page?.declaredCanonical,
      agencySiteId: page?.agencySiteId || page?.siteId || null,
      siteSlug: page?.siteSlug || null,
      agencyId: page?.agencyId || null,
      agencyName: page?.agencyName || null,
      details: LOCAL_REASON_DEFINITIONS[reason] ? {
        pageId: page?.pageId || null,
        pageSlug: page?.pageSlug || null,
        inSitemap: page?.inSitemap ?? null,
        indexableByLocalContract: page?.indexableByLocalContract ?? null,
        robotsDirective: page?.robotsDirective || null,
        declaredCanonical: page?.declaredCanonical || null,
        canonicalMatchesPublicUrl: page?.canonicalMatchesPublicUrl ?? null,
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
  const bySource = incidents.reduce((acc, item) => { acc[item.source] = (acc[item.source] || 0) + 1; return acc; }, {});
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
      bySource,
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
  coveragePages,
  dedupeIncidents,
};
