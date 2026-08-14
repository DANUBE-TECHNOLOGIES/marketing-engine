"use strict";

const { buildStructuredDataPlan } = require("./planner");
const {
  buildPublicSitemap,
  isPublishedPage,
  isPublishedSite,
} = require("./sitemap");
const {
  applyInspirationIndexabilityContract,
} = require("./inspiration-indexability");
const {
  auditSitemapCrawlability,
} = require("./crawlability-audit");
const { MiniSiteStructuredDataRepository } = require("./repository");

function normalizePublicOrigin(value) {
  return String(
    value ||
    process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
  ).trim().replace(/\/+$/g, "");
}

function isPublishedBlock(block) {
  if (!block) return false;
  if (block.published === true || block.isPublished === true) return true;
  return String(block.status || "").trim().toLowerCase() === "published";
}

function publicStructuredDataSite(site) {
  if (!isPublishedSite(site)) return null;

  return {
    ...site,
    pages: (site.pages || [])
      .filter(isPublishedPage)
      .map((page) => ({
        ...page,
        blocks: (page.blocks || []).filter(isPublishedBlock),
      })),
  };
}

class MiniSiteStructuredDataService {
  constructor({ prisma, repository, publicOrigin } = {}) {
    this.repository = repository || new MiniSiteStructuredDataRepository(prisma);
    this.publicOrigin = normalizePublicOrigin(publicOrigin);
  }

  health() {
    return {
      status: "ok",
      capability: "minisite-structured-data",
      persistence: false,
      destructive: false,
      deterministic: true,
      tenantScoped: true,
      publicGraphPublishedOnly: true,
      destinationSitemap: "localized-per-published-agency-site",
      editorialSitemap: "canonical-agency-only",
      inspirationIndexSitemap: "only-when-public-content-targets-agency",
      crawlabilityAudit: "discovery-source-and-orphan-detection",
      publicOrigin: this.publicOrigin,
      schemas: ["TravelAgency", "LocalBusiness", "WebSite", "WebPage", "BreadcrumbList", "FAQPage"],
      operations: ["previewNetwork", "previewSitemap", "previewSite"],
    };
  }

  async previewSite({ siteSlug, tenantId } = {}) {
    const site = await this.repository.findSiteBySlug(siteSlug, tenantId);
    const publicSite = publicStructuredDataSite(site);

    if (!publicSite) {
      const error = new Error(`Mini-site public introuvable : ${siteSlug}`);
      error.code = "MINISITE_STRUCTURED_DATA_SITE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const plan = buildStructuredDataPlan({ sites: [publicSite], publicOrigin: this.publicOrigin });
    const item = plan.items[0];
    return {
      version: plan.version,
      publicOrigin: plan.publicOrigin,
      siteSlug: item.siteSlug,
      agencyId: item.agencyId,
      agencyName: item.agencyName,
      validation: item.validation,
      summary: item.summary,
      graph: item.graph,
    };
  }

  async previewSitemap({ tenantId } = {}) {
    const [sites, inspirations, destinations] = await Promise.all([
      this.repository.listSites(tenantId),
      this.repository.listPublishedEditorialContents(tenantId),
      this.repository.listPublishedDestinations(tenantId),
    ]);

    const sitemap = buildPublicSitemap({
      sites,
      inspirations,
      destinations,
      publicOrigin: this.publicOrigin,
    });

    const indexableSitemap = applyInspirationIndexabilityContract(
      sitemap,
      sites,
      inspirations
    );

    return auditSitemapCrawlability(indexableSitemap);
  }

  async previewNetwork({ tenantId } = {}) {
    const sites = await this.repository.listSites(tenantId);
    return buildStructuredDataPlan({ sites, publicOrigin: this.publicOrigin });
  }
}

module.exports = {
  MiniSiteStructuredDataService,
  normalizePublicOrigin,
  isPublishedBlock,
  publicStructuredDataSite,
};
