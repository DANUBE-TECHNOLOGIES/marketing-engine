"use strict";

const { buildSeoPlan } = require("./planner");
const { auditLocalSeoCoverage } = require("../minisite-structured-data/local-seo-coverage");

const PROJECTABLE_BLOCKERS = new Set([
  "local-seo-not-ready",
  "local-core-intent-target-quality-weak",
]);

function clean(value) {
  return String(value || "").trim();
}

function projectedLocalState(coverageItem = {}) {
  const gaps = Array.isArray(coverageItem.gaps) ? coverageItem.gaps : [];
  const blockingGaps = gaps.filter((gap) => gap?.severity === "critical" || gap?.severity === "high");
  const localSeoScore = Number(coverageItem.score || 0);
  const scoreTargetMet = localSeoScore >= 85;
  const localSeoReady = blockingGaps.length === 0;
  const core = (coverageItem.intentTargetQuality?.intents || []).find((intent) => intent?.key === "agency");
  const coreTargetWeak = Boolean(core?.mapped && core?.qualityStatus === "weak");
  return {
    localSeoReady,
    localSeoScore,
    scoreTargetMet,
    gaps,
    blockingGaps,
    coreTargetWeak,
    coreTarget: core || null,
  };
}

function projectedReadiness(current = {}, coverage = {}) {
  const bySlug = new Map((coverage.sites || []).map((item) => [clean(item.siteSlug), item]));
  const currentSites = Array.isArray(current.sites) ? current.sites : [];

  const sites = currentSites.map((site) => {
    const local = bySlug.get(clean(site.siteSlug));
    const state = projectedLocalState(local || {});
    const retainedBlockers = (site.blockers || []).filter((blocker) => !PROJECTABLE_BLOCKERS.has(blocker));
    const blockers = retainedBlockers.slice();
    if (!state.localSeoReady) blockers.push("local-seo-not-ready");
    if (state.coreTargetWeak) blockers.push("local-core-intent-target-quality-weak");

    return {
      ...site,
      currentReadyToSubmit: site.readyToSubmit === true,
      currentBlockers: [...(site.blockers || [])],
      readyToSubmit: blockers.length === 0,
      blockers: [...new Set(blockers)],
      projectedLocalSeo: {
        score: state.localSeoScore,
        scoreTargetMet: state.scoreTargetMet,
        ready: state.localSeoReady,
        gapCount: state.gaps.length,
        gaps: state.gaps,
        blockingGapCount: state.blockingGaps.length,
        blockingGaps: state.blockingGaps,
      },
      projectedIntentTargetQuality: {
        coreTargetWeak: state.coreTargetWeak,
        coreTarget: state.coreTarget,
      },
    };
  });

  const notReady = sites.filter((site) => site.readyToSubmit !== true);
  return {
    ...current,
    mode: "projected-after-mse-25.30",
    current: {
      blocked: current.blocked === true,
      notReadyCount: Number(current.notReadyCount || 0),
      notReady: current.notReady || [],
    },
    sites,
    notReady,
    notReadyCount: notReady.length,
    blocked: notReady.length > 0,
    projectedLocalSeoAverageScore: coverage.summary?.averageScore || 0,
  };
}

function installProjectedReadiness(MiniSiteSeoEnrichmentService) {
  const prototype = MiniSiteSeoEnrichmentService?.prototype;
  if (!prototype || prototype.__mse2530ProjectedReadinessInstalled) return MiniSiteSeoEnrichmentService;
  prototype.__mse2530ProjectedReadinessInstalled = true;

  const originalBuildNetwork = prototype.buildNetworkContentOptimization;
  const originalSnapshot = prototype.createRollbackSnapshot;

  prototype.buildNetworkContentOptimization = async function buildNetworkContentOptimizationWithProjection(options = {}) {
    const result = await originalBuildNetwork.call(this, options);
    const sites = await this.repository.listSites();
    const metadataPlan = buildSeoPlan({ sites, publicOrigin: this.publicOrigin, optimizeExisting: true });
    const metadataByPage = new Map((metadataPlan.items || []).map((item) => [String(item.pageId), item]));

    let metadataPagesChanged = 0;
    let metadataFieldsChanged = 0;

    for (const agencyPlan of result.plans || []) {
      for (const item of agencyPlan.pages || []) {
        const metadata = metadataByPage.get(String(item.pageId));
        if (!metadata || !item.page) continue;

        const currentSeoTitle = clean(item.page.seoTitle);
        const currentMetaDescription = clean(item.page.metaDescription || item.page.seoDescription);
        const nextSeoTitle = clean(metadata.generated?.seoTitle) || currentSeoTitle;
        const nextMetaDescription = clean(metadata.generated?.metaDescription) || currentMetaDescription;
        const metadataChanged = currentSeoTitle !== nextSeoTitle || currentMetaDescription !== nextMetaDescription;

        item.currentPageMetadata = {
          seoTitle: item.page.seoTitle || null,
          metaDescription: item.page.metaDescription || null,
        };
        item.projectedPageMetadata = {
          seoTitle: nextSeoTitle || null,
          metaDescription: nextMetaDescription || null,
        };

        if (metadataChanged) {
          metadataPagesChanged += 1;
          metadataFieldsChanged += Number(currentSeoTitle !== nextSeoTitle) + Number(currentMetaDescription !== nextMetaDescription);
          item.changed = true;
          item.changes = Array.isArray(item.changes) ? item.changes : [];
          if (currentSeoTitle !== nextSeoTitle) item.changes.push({ blockType: "page", field: "seoTitle", previous: currentSeoTitle, next: nextSeoTitle, generated: true });
          if (currentMetaDescription !== nextMetaDescription) item.changes.push({ blockType: "page", field: "metaDescription", previous: currentMetaDescription, next: nextMetaDescription, generated: true });
        }

        item.page.seoTitle = nextSeoTitle || item.page.seoTitle;
        item.page.metaDescription = nextMetaDescription || item.page.metaDescription;
      }
      agencyPlan.summary.pagesChanged = (agencyPlan.pages || []).filter((page) => page.changed).length;
    }

    const projectedSites = (result.plans || []).map((agencyPlan) => {
      const currentSite = (sites || []).find((site) => String(site.agencyId || site.agency?.id) === String(agencyPlan.agencyId));
      return {
        ...(currentSite || {}),
        id: agencyPlan.siteId || currentSite?.id,
        slug: agencyPlan.siteSlug || currentSite?.slug,
        agency: currentSite?.agency || { id: agencyPlan.agencyId, city: agencyPlan.city },
        pages: (agencyPlan.pages || []).map((item) => ({
          ...(item.page || {}),
          blocks: item.optimizedBlocks || [],
          seoTitle: item.page?.seoTitle || null,
          metaDescription: item.page?.metaDescription || null,
        })),
      };
    });

    const coverage = auditLocalSeoCoverage(projectedSites, {}, { publicOrigin: this.publicOrigin });
    const sitemapReadiness = projectedReadiness(result.sitemapReadiness || {}, coverage);

    result.metadata = {
      optimizeExisting: true,
      pagesChanged: metadataPagesChanged,
      fieldsChanged: metadataFieldsChanged,
      planSummary: metadataPlan.summary,
    };
    result.projectedLocalSeoCoverage = coverage;
    result.sitemapReadiness = sitemapReadiness;
    result.summary.pagesChanged = (result.plans || []).reduce((sum, plan) => sum + Number(plan.summary?.pagesChanged || 0), 0);
    result.summary.metadataPagesChanged = metadataPagesChanged;
    result.summary.metadataFieldsChanged = metadataFieldsChanged;
    result.summary.sitemapSitesNotReady = sitemapReadiness.notReadyCount;
    result.summary.rolloutBlocked = result.similarity?.blocked === true || result.quality?.blocked === true || sitemapReadiness.blocked === true;

    return result;
  };

  prototype.createRollbackSnapshot = async function createRollbackSnapshotWithOriginalMetadata(persistence, agencyId, item, createdBy) {
    if (!item?.currentPageMetadata || !item?.page) return originalSnapshot.call(this, persistence, agencyId, item, createdBy);
    const projected = {
      seoTitle: item.page.seoTitle,
      metaDescription: item.page.metaDescription,
    };
    try {
      item.page.seoTitle = item.currentPageMetadata.seoTitle;
      item.page.metaDescription = item.currentPageMetadata.metaDescription;
      return await originalSnapshot.call(this, persistence, agencyId, item, createdBy);
    } finally {
      item.page.seoTitle = projected.seoTitle;
      item.page.metaDescription = projected.metaDescription;
    }
  };

  return MiniSiteSeoEnrichmentService;
}

module.exports = {
  PROJECTABLE_BLOCKERS,
  installProjectedReadiness,
  projectedLocalState,
  projectedReadiness,
};
