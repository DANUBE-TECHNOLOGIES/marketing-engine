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
function normalizeQuery(value) {
  return String(value || "").trim().toLocaleLowerCase("fr-FR");
}
function normalizePath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "/";
  try { return new URL(raw, "https://example.invalid").pathname.replace(/\/+$/g, "") || "/"; }
  catch (_) { return raw.split(/[?#]/)[0].replace(/\/+$/g, "") || "/"; }
}
function evidenceStrength(row = {}) {
  const impressions = Number(row.impressions || 0);
  const clicks = Number(row.clicks || 0);
  const position = Number(row.position || 0);
  if (impressions >= 100 && position > 5 && position <= 30) return "high";
  if (impressions >= 30 && position > 3 && position <= 50) return "medium";
  if (clicks > 0 || impressions >= 10) return "weak";
  return "none";
}

function buildSearchDemandEvidence({ preview = {}, analytics = null } = {}) {
  if (preview.readOnly !== true || preview.writes !== false || preview.policy?.automaticWrites !== false) {
    const error = new Error("Search demand evidence requires a safe read-only semantic preview.");
    error.code = "MSE_25_48_UNSAFE_PREVIEW";
    throw error;
  }

  const rows = Array.isArray(analytics?.rows) ? analytics.rows : [];
  const normalizedRows = rows.map((row) => ({
    query: String(row.query || row.keys?.[0] || "").trim(),
    page: String(row.page || row.keys?.[1] || "").trim(),
    path: normalizePath(row.page || row.keys?.[1]),
    clicks: Number(row.clicks || 0),
    impressions: Number(row.impressions || 0),
    ctr: Number(row.ctr || 0),
    position: Number(row.position || 0),
  })).filter((row) => row.query || row.page);

  const analyticsProvided = analytics !== null && analytics !== undefined;
  const analyticsAvailable = normalizedRows.length > 0;
  const analyticsInputState = analyticsProvided
    ? (analyticsAvailable ? "PROVIDED_WITH_ROWS" : "PROVIDED_EMPTY")
    : "NOT_PROVIDED";
  const dataState = analyticsAvailable ? "DATA_AVAILABLE" : "NO_DATA_YET";

  const signals = [];
  for (const agency of preview.agencies || []) {
    for (const coverage of agency.coverage || []) {
      if (coverage.commercial !== true) continue;
      const tokens = [coverage.label, coverage.intentKey, agency.site?.city]
        .map(normalizeQuery)
        .filter(Boolean);
      const matching = normalizedRows.filter((row) => {
        const q = normalizeQuery(row.query);
        const pagePath = normalizePath(row.page);
        const bestSlug = String(coverage.bestPageSlug || "").trim();
        const pageMatch = bestSlug && (pagePath.endsWith(`/${bestSlug}`) || pagePath.includes(`/${agency.site?.slug}/${bestSlug}`));
        const queryMatch = tokens.some((token) => token.length >= 3 && q.includes(token));
        return pageMatch || queryMatch;
      });
      const aggregate = matching.reduce((acc, row) => {
        acc.clicks += row.clicks;
        acc.impressions += row.impressions;
        acc.weightedPosition += row.position * Math.max(row.impressions, 1);
        acc.weight += Math.max(row.impressions, 1);
        return acc;
      }, { clicks: 0, impressions: 0, weightedPosition: 0, weight: 0 });
      const position = aggregate.weight ? aggregate.weightedPosition / aggregate.weight : 0;
      const strength = evidenceStrength({ ...aggregate, position });
      signals.push({
        siteSlug: agency.site?.slug || null,
        agencyId: agency.site?.agencyId || null,
        city: agency.site?.city || null,
        intentKey: coverage.intentKey,
        status: coverage.status,
        bestPageSlug: coverage.bestPageSlug,
        bestScore: Number(coverage.bestScore || 0),
        clicks: aggregate.clicks,
        impressions: aggregate.impressions,
        position: Number(position.toFixed(2)),
        matchingQueryCount: matching.length,
        evidenceStrength: strength,
        evidenceState: analyticsAvailable ? (strength === "none" ? "NO_MATCHING_EVIDENCE" : "EVIDENCE_OBSERVED") : "UNKNOWN_NO_DATA",
        eligibleForSeoReview: analyticsAvailable && ["medium", "high"].includes(strength),
        automaticWrite: false,
      });
    }
  }

  const result = {
    type: "mse-25.48-search-demand-evidence",
    sourcePlanFingerprint: preview.planFingerprint,
    sourceAnalyticsFingerprint: analytics?.analyticsFingerprint || null,
    analyticsProvided,
    analyticsInputState,
    analyticsAvailable,
    analyticsRowCount: normalizedRows.length,
    analyticsSource: analyticsProvided ? {
      source: analytics?.source || null,
      siteUrl: analytics?.siteUrl || null,
      startDate: analytics?.startDate || null,
      endDate: analytics?.endDate || null,
      dataState: analytics?.dataState || null,
    } : null,
    dataState,
    lifecycleState: analyticsAvailable ? "SEARCH_DEMAND_EVIDENCE_READY" : "WAITING_FOR_SEARCH_DEMAND_DATA",
    noDataIsNotNoDemand: true,
    demandConclusion: analyticsAvailable ? "EVIDENCE_EVALUATED" : "UNDETERMINED_NO_DATA",
    readOnly: true,
    writes: false,
    destructive: false,
    policy: {
      demandEvidenceRequiredBeforeNewSeoExecution: true,
      semanticGapAloneIsInsufficient: true,
      noDataMustNotBeInterpretedAsNoDemand: true,
      noAutomaticPageCreation: true,
      noAutomaticContentWrite: true,
      automaticWrites: false,
    },
    signals,
    summary: {
      commercialIntentCount: signals.length,
      highEvidenceCount: signals.filter((r) => r.evidenceStrength === "high").length,
      mediumEvidenceCount: signals.filter((r) => r.evidenceStrength === "medium").length,
      weakEvidenceCount: signals.filter((r) => r.evidenceStrength === "weak").length,
      noEvidenceCount: analyticsAvailable ? signals.filter((r) => r.evidenceStrength === "none").length : 0,
      unknownDueToNoDataCount: analyticsAvailable ? 0 : signals.length,
      reviewEligibleCount: signals.filter((r) => r.eligibleForSeoReview).length,
      automaticWriteCount: 0,
    },
  };
  return { ...result, evidenceFingerprint: fingerprint(result) };
}

module.exports = { buildSearchDemandEvidence, evidenceStrength, normalizePath, fingerprint };
