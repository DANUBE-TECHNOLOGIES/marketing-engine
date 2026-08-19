"use strict";

const { MiniSiteSeoRepository } = require("../minisite-seo-enrichment/repository");
const { MiniSiteSeoEnrichmentService } = require("../minisite-seo-enrichment/service");
const { networkSemanticPlan, semanticPlan } = require("./engine");

class MiniSiteSemanticEngineService {
  constructor({ prisma, repository, enrichmentService } = {}) {
    this.repository = repository || new MiniSiteSeoRepository(prisma);
    this.enrichmentService = enrichmentService || new MiniSiteSeoEnrichmentService({ prisma, repository: this.repository });
  }

  health() {
    return {
      status: "ok",
      version: "mse-25.40",
      capability: "local-seo-semantic-engine",
      readOnly: true,
      writes: false,
      destructive: false,
      doorwayGuard: true,
      locationExpansion: false,
      autoCreatePages: false,
      routes: ["agency-preview", "network-preview"],
    };
  }

  async siteWithContent(agencyId) {
    const summary = await this.repository.findSiteByAgency(agencyId);
    if (!summary) {
      const error = new Error("Mini-site introuvable pour cette agence.");
      error.code = "MSE_25_40_SITE_NOT_FOUND";
      error.status = 404;
      throw error;
    }
    const content = await this.enrichmentService.buildAgencyContentOptimization({ agencyId });
    return {
      ...summary,
      pages: (content.pages || []).map((row) => ({
        ...(row.page || {}),
        id: row.pageId || row.page?.id || null,
        slug: row.slug || row.page?.slug || null,
        title: row.title || row.page?.title || null,
        published: row.published === true || row.page?.published === true,
        status: row.page?.status || (row.published === true ? "published" : null),
        blocks: row.currentBlocks || row.page?.blocks || [],
      })),
      semanticExcludedPages: content.excludedPages || [],
    };
  }

  async previewAgency({ agencyId } = {}) {
    if (agencyId === undefined || agencyId === null || agencyId === "") {
      const error = new Error("agencyId est obligatoire.");
      error.code = "MSE_25_40_AGENCY_ID_REQUIRED";
      error.status = 400;
      throw error;
    }
    return semanticPlan(await this.siteWithContent(agencyId));
  }

  async previewNetwork() {
    const sites = await this.repository.listSites();
    const hydrated = [];
    for (const site of sites || []) {
      if (!(String(site.status || "").toLowerCase() === "published" || Boolean(site.publishedAt))) {
        hydrated.push({ ...site, pages: [] });
        continue;
      }
      const agencyId = site.agencyId || site.agency?.id;
      if (!agencyId) continue;
      hydrated.push(await this.siteWithContent(agencyId));
    }
    return networkSemanticPlan(hydrated);
  }
}

module.exports = { MiniSiteSemanticEngineService };
