"use strict";

function number(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function googleState(performance) {
  if (!performance) return "UNAVAILABLE";
  if (number(performance.rowCount) > 0 || number(performance?.totals?.impressions) > 0 || number(performance?.totals?.clicks) > 0) {
    return "SEARCH_DATA_AVAILABLE";
  }
  return "NO_DATA_YET";
}

function lifecycle({ runtime, performance }) {
  if (!runtime) return "OBSERVATION_UNAVAILABLE";
  if (runtime.readyForGoogleDiscovery !== true || (runtime.blockers || []).length > 0) return "LOCAL_OR_PUBLIC_BLOCKER";
  if (googleState(performance) === "SEARCH_DATA_AVAILABLE") return "GOOGLE_SEARCH_DATA_OBSERVED";
  return "WAITING_FOR_GOOGLE_SEARCH_DATA";
}

class PostSubmissionGoogleMonitor {
  constructor({ runtimeAuditService, performanceService } = {}) {
    if (!runtimeAuditService) throw new Error("runtimeAuditService est requis");
    if (!performanceService) throw new Error("performanceService est requis");
    this.runtimeAuditService = runtimeAuditService;
    this.performanceService = performanceService;
  }

  async observe({ tenantId, coverage, siteUrl, pagePrefix, days = 28, limit = 200 } = {}) {
    const runtime = await this.runtimeAuditService.audit({ tenantId, coverage, limit });
    let performance = null;
    let performanceError = null;

    try {
      performance = await this.performanceService.query({
        siteUrl,
        pagePrefix,
        days,
        dimensions: ["page"],
        rowLimit: Math.min(1000, Math.max(1, Number(limit || 200))),
      });
    } catch (error) {
      performanceError = {
        code: error?.code || "SEARCH_CONSOLE_PERFORMANCE_UNAVAILABLE",
        message: error?.message || "Search Console Analytics indisponible.",
      };
    }

    const dataState = performanceError ? "UNAVAILABLE" : googleState(performance);
    const state = performanceError && runtime?.readyForGoogleDiscovery === true
      ? "WAITING_FOR_GOOGLE_SEARCH_DATA"
      : lifecycle({ runtime, performance });

    return {
      version: "mse-25.98",
      mode: "POST_SUBMISSION_READ_ONLY",
      lifecycle: state,
      readyForGoogleDiscovery: runtime?.readyForGoogleDiscovery === true,
      googleDataState: dataState,
      summary: {
        expectedSitemapUrlCount: number(runtime?.summary?.expectedSitemapUrlCount),
        publicSitemapUrlCount: number(runtime?.summary?.publicSitemapUrlCount),
        reachablePageCount: number(runtime?.summary?.reachablePageCount),
        publicIssueCount: number(runtime?.summary?.publicIssueCount),
        localIssuePageCount: number(runtime?.summary?.localIssuePageCount),
        searchConsoleRowCount: number(performance?.rowCount),
        clicks: number(performance?.totals?.clicks),
        impressions: number(performance?.totals?.impressions),
        ctr: number(performance?.totals?.ctr),
        position: number(performance?.totals?.position),
      },
      searchConsole: {
        siteUrl: performance?.siteUrl || siteUrl || null,
        pagePrefix: performance?.pagePrefix || pagePrefix || null,
        startDate: performance?.startDate || null,
        endDate: performance?.endDate || null,
        rowCount: number(performance?.rowCount),
        totals: performance?.totals || { clicks: 0, impressions: 0, ctr: 0, position: 0 },
        delta: performance?.delta || { clicks: 0, impressions: 0, ctr: 0, position: 0 },
        error: performanceError,
        semantics: "Les donnees Search Analytics prouvent une exposition dans les resultats Google lorsqu'elles apparaissent. Leur absence ne prouve pas une absence d'indexation.",
      },
      runtime: {
        version: runtime?.version || null,
        verdict: runtime?.verdict || null,
        blockers: runtime?.blockers || [],
        warnings: runtime?.warnings || [],
      },
      invariants: {
        readOnly: true,
        googleWrites: false,
        sitemapSubmission: false,
        urlSubmission: false,
        automaticRemediation: false,
        pageMutation: false,
        websiteDesignerMutation: false,
      },
      observedAt: new Date().toISOString(),
    };
  }
}

module.exports = {
  PostSubmissionGoogleMonitor,
  googleState,
  lifecycle,
};
