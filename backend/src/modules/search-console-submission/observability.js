"use strict";

const { MiniSiteStructuredDataService } = require("../minisite-structured-data/service");
const { DisabledSearchConsoleProvider } = require("./provider");
const { siteSitemapPublicUrl } = require("./service");

class SearchConsoleObservabilityService {
  constructor({ prisma, structuredDataService, provider } = {}) {
    if (!prisma && !structuredDataService) throw new Error("Prisma ou structuredDataService est requis");
    this.structuredDataService = structuredDataService || new MiniSiteStructuredDataService({ prisma });
    this.provider = provider || new DisabledSearchConsoleProvider();
  }

  async sitemapStatus({ tenantId, siteSlug, siteUrl } = {}) {
    const slug = String(siteSlug || "").trim();
    if (!slug) {
      const error = new Error("Le slug du mini-site est obligatoire.");
      error.code = "SEARCH_CONSOLE_SITE_SLUG_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const sitemapUrl = siteSitemapPublicUrl(this.structuredDataService.publicOrigin, slug);
    const candidate = await this.structuredDataService.siteSitemapCandidate({ tenantId, siteSlug: slug });
    const google = await this.provider.getSitemap({ siteUrl, sitemapUrl });
    const submittedUrls = (google.contents || []).reduce(
      (total, item) => total + Number(item?.submitted || 0),
      0
    );

    return {
      siteSlug: slug,
      siteUrl: String(siteUrl || "").trim(),
      sitemapUrl,
      local: {
        readyToSubmit: candidate.readyToSubmit === true,
        entryCount: Number(candidate.entryCount || 0),
        readiness: candidate.readiness || null,
      },
      google: {
        ...google,
        submittedUrls,
        processed: google.isPending !== true,
        healthy: google.isPending !== true && Number(google.errors || 0) === 0,
      },
      observedAt: new Date().toISOString(),
    };
  }
}

module.exports = { SearchConsoleObservabilityService };
