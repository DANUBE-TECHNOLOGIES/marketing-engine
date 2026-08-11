"use strict";

const { buildStructuredDataPlan } = require("./planner");
const { buildPublicSitemap } = require("./sitemap");
const { MiniSiteStructuredDataRepository } = require("./repository");

function normalizePublicOrigin(value) {
  return String(
    value ||
    process.env.PUBLIC_SITE_ORIGIN ||
    process.env.NEXT_PUBLIC_SITE_ORIGIN ||
    "https://agences.mondescale.com"
  ).trim().replace(/\/+$/g, "");
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
      destinationSitemap: "localized-per-published-agency-site",
      editorialSitemap: "canonical-agency-only",
      publicOrigin: this.publicOrigin,
      schemas: ["TravelAgency", "LocalBusiness", "WebSite", "WebPage", "BreadcrumbList", "FAQPage"],
      operations: ["previewNetwork", "previewSitemap", "previewSite"],
    };
  }

  async previewSite({ siteSlug, tenantId } = {}) {
    const site = await this.repository.findSiteBySlug(siteSlug, tenantId);
    if (!site) {
      const error = new Error(`Mini-site introuvable : ${siteSlug}`);
      error.code = "MINISITE_STRUCTURED_DATA_SITE_NOT_FOUND";
      error.status = 404;
      throw error;
    }

    const plan = buildStructuredDataPlan({ sites: [site], publicOrigin: this.publicOrigin });
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

    return buildPublicSitemap({
      sites,
      inspirations,
      destinations,
      publicOrigin: this.publicOrigin,
    });
  }

  async previewNetwork({ tenantId } = {}) {
    const sites = await this.repository.listSites(tenantId);
    return buildStructuredDataPlan({ sites, publicOrigin: this.publicOrigin });
  }
}

module.exports = {
  MiniSiteStructuredDataService,
  normalizePublicOrigin,
};
