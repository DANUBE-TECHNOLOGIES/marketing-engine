"use strict";

class DisabledSearchConsoleProvider {
  constructor() {
    this.name = "disabled";
  }

  isConfigured() {
    return false;
  }

  async submitSitemap() {
    const error = new Error("Le provider Google Search Console n’est pas configuré.");
    error.code = "SEARCH_CONSOLE_PROVIDER_NOT_CONFIGURED";
    error.statusCode = 503;
    throw error;
  }
}

function validateSearchConsoleSubmissionTarget({ siteUrl, sitemapUrl } = {}) {
  const property = String(siteUrl || "").trim();
  const feedpath = String(sitemapUrl || "").trim();

  if (!property) {
    const error = new Error("La propriété Search Console est obligatoire.");
    error.code = "SEARCH_CONSOLE_SITE_URL_REQUIRED";
    error.statusCode = 400;
    throw error;
  }

  if (!feedpath || !/^https:\/\//i.test(feedpath)) {
    const error = new Error("Une URL HTTPS de sitemap est obligatoire.");
    error.code = "SEARCH_CONSOLE_SITEMAP_URL_REQUIRED";
    error.statusCode = 400;
    throw error;
  }

  return { siteUrl: property, sitemapUrl: feedpath };
}

module.exports = {
  DisabledSearchConsoleProvider,
  validateSearchConsoleSubmissionTarget,
};