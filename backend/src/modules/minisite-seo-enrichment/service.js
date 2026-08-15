"use strict";

const { buildSeoPlan } = require("./planner");
const { MiniSiteSeoRepository } = require("./repository");
const { applyOptimizedSeoItems } = require("./optimizer-executor");
const { optimizePageContent } = require("./content-optimizer");
const PageBuilderPersistenceService = require("../page-builder-persistence/service");

class MiniSiteSeoEnrichmentService {
  constructor({ prisma, repository, publicOrigin, pageBuilderPersistenceService } = {}) {
    this.repository = repository || new MiniSiteSeoRepository(prisma);
    this.publicOrigin = publicOrigin || "https://agences.mondescale.com";
    this.pageBuilderPersistenceService = pageBuilderPersistenceService || (prisma ? new PageBuilderPersistenceService({ prisma }) : null);
  }

  health() {
    return {
      status: "ok",
      capability: "minisite-seo-enrichment",
      persistence: true,
      deterministic: true,
      versionedContentWrites: true,
      operations: ["previewNetwork", "previewAgency", "applyAgency", "previewAgencyOptimization", "optimizeAgency", "previewAgencyContentOptimization", "optimizeAgencyContent", "normalizeAgencyTitles"],
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

    for (const pageSummary of site.pages || []) {
      const page = await persistence.get({ agencyId, pageSlug: pageSummary.slug });
      const result = optimizePageContent({ agency: site.agency || {}, page, blocks: page.blocks || [] });
      pages.push({
        pageId: page.id,
        slug: page.slug,
        title: page.title,
        published: page.published === true,
        changed: result.changed,
        changes: result.changes,
        currentBlocks: page.blocks || [],
        optimizedBlocks: result.blocks,
        page,
      });
    }

    return {
      version: "mse-25.30",
      agencyId,
      siteId: site.id,
      siteSlug: site.slug,
      pages,
      summary: {
        pagesProcessed: pages.length,
        pagesChanged: pages.filter((page) => page.changed).length,
        blockFieldsChanged: pages.reduce((sum, page) => sum + page.changes.length, 0),
      },
    };
  }

  async previewAgencyContentOptimization({ agencyId } = {}) {
    const plan = await this.buildAgencyContentOptimization({ agencyId });
    return {
      operation: "preview-content-optimize",
      destructive: false,
      writes: false,
      ...plan,
      pages: plan.pages.map(({ page, currentBlocks, optimizedBlocks, ...item }) => ({ ...item, before: currentBlocks, after: optimizedBlocks })),
    };
  }

  async optimizeAgencyContent({ agencyId, dryRun = true, confirm = false, createdBy = "minisite-seo-optimizer" } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire pour optimiser le contenu visible.");
      error.code = "MINISITE_SEO_CONTENT_OPTIMIZATION_CONFIRMATION_REQUIRED";
      error.status = 400;
      throw error;
    }

    const plan = await this.buildAgencyContentOptimization({ agencyId });
    if (dryRun !== false) {
      return {
        operation: "preview-content-optimize",
        destructive: false,
        writes: false,
        agencyId,
        summary: plan.summary,
        pages: plan.pages.map(({ page, currentBlocks, optimizedBlocks, ...item }) => ({ ...item, before: currentBlocks, after: optimizedBlocks })),
      };
    }

    const persistence = this.requirePageBuilderPersistence();
    const results = [];
    for (const item of plan.pages) {
      if (!item.changed) {
        results.push({ pageId: item.pageId, slug: item.slug, changed: false, version: item.page.version || null });
        continue;
      }

      const saved = await persistence.save({
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
          blocks: item.optimizedBlocks,
        },
        metadata: {
          reason: "mse-25.30-local-content-optimization",
          createdBy,
        },
      });
      results.push({ pageId: saved.id, slug: saved.slug, changed: true, version: saved.version, changes: item.changes });
    }

    return {
      operation: "content-optimize",
      destructive: false,
      writes: true,
      versioned: true,
      agencyId,
      summary: {
        ...plan.summary,
        pagesWritten: results.filter((item) => item.changed).length,
      },
      pages: results,
    };
  }

  async normalizeAgencyTitles({ agencyId, limit = 65, dryRun = true, confirm = false } = {}) {
    if (dryRun === false && confirm !== true) {
      const error = new Error("Une confirmation explicite est obligatoire.");
      error.code = "MINISITE_SEO_CONFIRMATION_REQUIRED";
      error.status = 400;
      throw error;
    }
    return this.repository.normalizeLongSeoTitles({ agencyId, limit, dryRun: dryRun !== false });
  }

  async previewNetwork() {
    const sites = await this.repository.listSites();
    return buildSeoPlan({ sites, publicOrigin: this.publicOrigin, optimizeExisting: false });
  }
}

module.exports = { MiniSiteSeoEnrichmentService };
