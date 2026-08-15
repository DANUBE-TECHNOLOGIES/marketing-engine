"use strict";

const { buildSeoPlan } = require("./planner");
const { MiniSiteSeoRepository } = require("./repository");
const { applyOptimizedSeoItems } = require("./optimizer-executor");
const { optimizePageContent } = require("./content-optimizer");
const { resolvedTargetCities } = require("./local-area-context");
const { applyLocalAreaDifferentiation } = require("./local-differentiator");
const { networkSimilarityReport } = require("./similarity-guard");
const { preRolloutQualityReport } = require("./pre-rollout-quality");
const { MiniSiteStructuredDataService } = require("../minisite-structured-data/service");
const PageBuilderPersistenceService = require("../page-builder-persistence/service");

class MiniSiteSeoEnrichmentService {
  constructor({ prisma, repository, publicOrigin, pageBuilderPersistenceService, structuredDataService } = {}) {
    this.repository = repository || new MiniSiteSeoRepository(prisma);
    this.publicOrigin = publicOrigin || "https://agences.mondescale.com";
    this.pageBuilderPersistenceService = pageBuilderPersistenceService || (prisma ? new PageBuilderPersistenceService({ prisma }) : null);
    this.structuredDataService = structuredDataService || (prisma ? new MiniSiteStructuredDataService({ prisma, publicOrigin: this.publicOrigin }) : null);
  }

  health() {
    return {
      status: "ok",
      capability: "minisite-seo-enrichment",
      persistence: true,
      deterministic: true,
      versionedContentWrites: true,
      networkSimilarityGuard: true,
      preRolloutQualityGate: true,
      sitemapReadinessGate: Boolean(this.structuredDataService),
      networkRollbackSnapshots: true,
      operations: ["previewNetwork", "previewAgency", "applyAgency", "previewAgencyOptimization", "optimizeAgency", "previewAgencyContentOptimization", "optimizeAgencyContent", "previewNetworkContentOptimization", "optimizeNetworkContent", "normalizeAgencyTitles"],
    };
  }

  async requireAgencySite(agencyId) {
    if (agencyId === undefined || agencyId === null || agencyId === "") {
      const error = new Error("agencyId est obligatoire.");
      error.code = "MINISITE_SEO_AGENCY_ID_REQUIRED";
      error.status = 400;
      throw error;
    }
    const site = await this.repository.findSiteByAgency(agencyId);
    if (!site) {
      const error = new Error("Mini-site introuvable pour cette agence.");
      error.code = "MINISITE_SEO_SITE_NOT_FOUND";
      error.status = 404;
      throw error;
    }
    return site;
  }

  requirePageBuilderPersistence() {
    if (!this.pageBuilderPersistenceService) {
      const error = new Error("Le service de persistance Website Designer V2 est indisponible.");
      error.code = "MINISITE_SEO_PAGE_BUILDER_PERSISTENCE_UNAVAILABLE";
      error.status = 503;
      throw error;
    }
    return this.pageBuilderPersistenceService;
  }

  async previewAgency({ agencyId } = {}) {
    const site = await this.requireAgencySite(agencyId);
    return buildSeoPlan({ sites: [site], publicOrigin: this.publicOrigin, optimizeExisting: false });
  }

  async previewAgencyOptimization({ agencyId } = {}) {
    const site = await this.requireAgencySite(agencyId);
    return buildSeoPlan({ sites: [site], publicOrigin: this.publicOrigin, optimizeExisting: true });
  }

  async applyAgency({ agencyId, dryRun = true, confirm = false } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire.");
      error.code = "MINISITE_SEO_CONFIRMATION_REQUIRED";
      error.status = 400;
      throw error;
    }
    const plan = await this.previewAgency({ agencyId });
    const execution = await this.repository.applySeoItems({ items: plan.items, dryRun: dryRun !== false });
    return { operation: dryRun === false ? "apply" : "preview-apply", destructive: false, overwrite: false, agencyId, planSummary: plan.summary, execution };
  }

  async optimizeAgency({ agencyId, dryRun = true, confirm = false } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire pour optimiser les métadonnées existantes.");
      error.code = "MINISITE_SEO_OPTIMIZATION_CONFIRMATION_REQUIRED";
      error.status = 400;
      throw error;
    }
    const plan = await this.previewAgencyOptimization({ agencyId });
    const execution = await applyOptimizedSeoItems(this.repository, { items: plan.items, dryRun: dryRun !== false });
    return { operation: dryRun === false ? "optimize" : "preview-optimize", destructive: false, overwrite: true, agencyId, planSummary: plan.summary, execution };
  }

  async buildAgencyContentOptimization({ agencyId } = {}) {
    const site = await this.requireAgencySite(agencyId);
    const persistence = this.requirePageBuilderPersistence();
    const pages = [];
    const targetCities = resolvedTargetCities(site, { limit: 5 });

    for (const pageSummary of site.pages || []) {
      const page = await persistence.get({ agencyId, pageSlug: pageSummary.slug });
      const baseResult = optimizePageContent({ agency: site.agency || {}, page, blocks: page.blocks || [], availablePages: site.pages || [], siteSlug: site.slug || "" });
      const result = applyLocalAreaDifferentiation({ blocks: baseResult.blocks, changes: baseResult.changes, agency: site.agency || {}, page, targetCities });
      pages.push({ pageId: page.id, slug: page.slug, title: page.title, published: page.published === true, changed: result.changed, changes: result.changes, currentBlocks: page.blocks || [], optimizedBlocks: result.blocks, page });
    }

    return {
      version: "mse-25.30", agencyId, siteId: site.id, siteSlug: site.slug, city: site.agency?.city || "", targetCities, pages,
      summary: { pagesProcessed: pages.length, pagesChanged: pages.filter((page) => page.changed).length, blockFieldsChanged: pages.reduce((sum, page) => sum + page.changes.length, 0), localAreaCities: targetCities.length },
    };
  }

  async previewAgencyContentOptimization({ agencyId } = {}) {
    const plan = await this.buildAgencyContentOptimization({ agencyId });
    return { operation: "preview-content-optimize", destructive: false, writes: false, ...plan, pages: plan.pages.map(({ page, currentBlocks, optimizedBlocks, ...item }) => ({ ...item, before: currentBlocks, after: optimizedBlocks })) };
  }

  async optimizeAgencyContent({ agencyId, dryRun = true, confirm = false, createdBy = "minisite-seo-optimizer" } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire pour optimiser le contenu visible.");
      error.code = "MINISITE_SEO_CONTENT_OPTIMIZATION_CONFIRMATION_REQUIRED";
      error.status = 400;
      throw error;
    }
    const plan = await this.buildAgencyContentOptimization({ agencyId });
    if (dryRun !== false) return { operation: "preview-content-optimize", destructive: false, writes: false, agencyId, summary: plan.summary, pages: plan.pages.map(({ page, currentBlocks, optimizedBlocks, ...item }) => ({ ...item, before: currentBlocks, after: optimizedBlocks })) };

    const persistence = this.requirePageBuilderPersistence();
    const results = [];
    for (const item of plan.pages) {
      if (!item.changed) { results.push({ pageId: item.pageId, slug: item.slug, changed: false, version: item.page.version || null }); continue; }
      const saved = await persistence.save({ agencyId, pageSlug: item.slug, body: { page: { title: item.page.title, slug: item.page.slug, status: item.page.status, seoTitle: item.page.seoTitle, metaDescription: item.page.metaDescription, published: item.page.published }, blocks: item.optimizedBlocks }, metadata: { reason: "mse-25.30-local-content-optimization", createdBy } });
      results.push({ pageId: saved.id, slug: saved.slug, changed: true, version: saved.version, changes: item.changes });
    }
    return { operation: "content-optimize", destructive: false, writes: true, versioned: true, agencyId, summary: { ...plan.summary, pagesWritten: results.filter((item) => item.changed).length }, pages: results };
  }

  async buildSitemapReadiness() {
    if (!this.structuredDataService) return { available: false, blocked: false, notReadyCount: 0, sites: [] };
    const sitemap = await this.structuredDataService.previewSitemap();
    const sites = Array.isArray(sitemap?.indexationReadiness?.sites) ? sitemap.indexationReadiness.sites : [];
    const notReady = sites.filter((site) => site?.readyToSubmit !== true);
    return { available: true, blocked: notReady.length > 0, notReadyCount: notReady.length, sites, notReady, entryCount: Array.isArray(sitemap?.entries) ? sitemap.entries.length : 0 };
  }

  async buildNetworkContentOptimization({ similarityThreshold = 0.78, minimumWords = 80, qualityMinimumWords = 120 } = {}) {
    const sites = await this.repository.listSites();
    const plans = [];
    for (const site of sites || []) {
      const agencyId = site.agencyId || site.agency?.id;
      if (!agencyId) continue;
      plans.push(await this.buildAgencyContentOptimization({ agencyId }));
    }
    const similarity = networkSimilarityReport(plans, { threshold: similarityThreshold, minimumWords });
    const quality = preRolloutQualityReport(plans, { minimumWords: qualityMinimumWords });
    const sitemapReadiness = await this.buildSitemapReadiness();
    return {
      version: "mse-25.30", plans, similarity, quality, sitemapReadiness,
      summary: {
        agenciesProcessed: plans.length,
        pagesProcessed: plans.reduce((sum, plan) => sum + plan.summary.pagesProcessed, 0),
        pagesChanged: plans.reduce((sum, plan) => sum + plan.summary.pagesChanged, 0),
        similarityConflicts: similarity.conflictCount,
        qualityBlockingIssues: quality.blockingCount,
        qualityWarnings: quality.warningCount,
        sitemapSitesNotReady: sitemapReadiness.notReadyCount,
        rolloutBlocked: similarity.blocked || quality.blocked || sitemapReadiness.blocked,
      },
    };
  }

  async previewNetworkContentOptimization(options = {}) {
    const plan = await this.buildNetworkContentOptimization(options);
    return { operation: "preview-network-content-optimize", destructive: false, writes: false, ...plan, plans: plan.plans.map((agencyPlan) => ({ ...agencyPlan, pages: agencyPlan.pages.map(({ page, currentBlocks, optimizedBlocks, ...item }) => ({ ...item, before: currentBlocks, after: optimizedBlocks })) })) };
  }

  async createRollbackSnapshot(persistence, agencyId, item, createdBy) {
    const snapshot = await persistence.save({
      agencyId,
      pageSlug: item.slug,
      body: {
        page: {
          title: item.page.title,
          slug: item.page.slug,
          status: item.page.status,
          seoTitle: item.page.seoTitle,
          metaDescription: item.page.metaDescription,
          published: item.page.published,
        },
        blocks: item.currentBlocks,
      },
      metadata: {
        reason: "mse-25.30-network-pre-rollout-snapshot",
        createdBy,
      },
    });
    const versions = await persistence.versions({ agencyId, pageSlug: item.slug });
    const rollbackVersion = (versions.items || []).find((version) => Number(version.version) === Number(snapshot.version)) || (versions.items || [])[0] || null;
    return {
      version: snapshot.version || null,
      versionId: rollbackVersion?.id || null,
    };
  }

  async optimizeNetworkContent({ dryRun = true, confirm = false, createdBy = "minisite-seo-network-rollout", similarityThreshold = 0.78, minimumWords = 80, qualityMinimumWords = 120 } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire pour le rollout SEO réseau."); error.code = "MINISITE_SEO_NETWORK_ROLLOUT_CONFIRMATION_REQUIRED"; error.status = 400; throw error;
    }
    const plan = await this.buildNetworkContentOptimization({ similarityThreshold, minimumWords, qualityMinimumWords });
    if (dryRun !== false) return { operation: "preview-network-content-optimize", destructive: false, writes: false, summary: plan.summary, similarity: plan.similarity, quality: plan.quality, sitemapReadiness: plan.sitemapReadiness };

    if (plan.similarity.blocked) { const error = new Error(`Rollout bloqué : ${plan.similarity.conflictCount} conflit(s) de similarité inter-agences au-dessus du seuil.`); error.code = "MINISITE_SEO_NETWORK_SIMILARITY_BLOCKED"; error.status = 409; error.details = plan.similarity; throw error; }
    if (plan.quality.blocked) { const error = new Error(`Rollout bloqué : ${plan.quality.blockingCount} anomalie(s) SEO pré-rollout bloquante(s).`); error.code = "MINISITE_SEO_NETWORK_QUALITY_BLOCKED"; error.status = 409; error.details = plan.quality; throw error; }
    if (plan.sitemapReadiness.blocked) { const error = new Error(`Rollout bloqué : ${plan.sitemapReadiness.notReadyCount} mini-site(s) ne sont pas prêts pour l'indexation sitemap.`); error.code = "MINISITE_SEO_NETWORK_SITEMAP_READINESS_BLOCKED"; error.status = 409; error.details = plan.sitemapReadiness; throw error; }

    const persistence = this.requirePageBuilderPersistence();
    const agencies = [];
    let pagesWritten = 0;
    let rollbackSnapshots = 0;
    for (const agencyPlan of plan.plans) {
      const results = [];
      for (const item of agencyPlan.pages) {
        if (!item.changed) { results.push({ pageId: item.pageId, slug: item.slug, changed: false, version: item.page.version || null, rollbackVersionId: null }); continue; }
        const rollback = await this.createRollbackSnapshot(persistence, agencyPlan.agencyId, item, createdBy);
        rollbackSnapshots += 1;
        const saved = await persistence.save({ agencyId: agencyPlan.agencyId, pageSlug: item.slug, body: { page: { title: item.page.title, slug: item.page.slug, status: item.page.status, seoTitle: item.page.seoTitle, metaDescription: item.page.metaDescription, published: item.page.published }, blocks: item.optimizedBlocks }, metadata: { reason: "mse-25.30-network-local-content-rollout", createdBy } });
        pagesWritten += 1;
        results.push({ pageId: saved.id, slug: saved.slug, changed: true, version: saved.version, rollbackVersion: rollback.version, rollbackVersionId: rollback.versionId, changes: item.changes });
      }
      agencies.push({ agencyId: agencyPlan.agencyId, siteSlug: agencyPlan.siteSlug, pages: results });
    }
    return { operation: "network-content-optimize", destructive: false, writes: true, versioned: true, rollbackReady: true, similarity: plan.similarity, quality: plan.quality, sitemapReadiness: plan.sitemapReadiness, summary: { ...plan.summary, pagesWritten, rollbackSnapshots }, agencies };
  }

  async normalizeAgencyTitles({ agencyId, limit = 65, dryRun = true, confirm = false } = {}) {
    if (dryRun === false && confirm !== true) { const error = new Error("Une confirmation explicite est obligatoire."); error.code = "MINISITE_SEO_CONFIRMATION_REQUIRED"; error.status = 400; throw error; }
    return this.repository.normalizeLongSeoTitles({ agencyId, limit, dryRun: dryRun !== false });
  }

  async previewNetwork() { const sites = await this.repository.listSites(); return buildSeoPlan({ sites, publicOrigin: this.publicOrigin, optimizeExisting: false }); }
}

module.exports = { MiniSiteSeoEnrichmentService };
