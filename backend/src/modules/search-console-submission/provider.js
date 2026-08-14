"use strict";

const SEARCH_CONSOLE_API_ROOT = "https://www.googleapis.com/webmasters/v3";

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

class GoogleSearchConsoleProvider {
  constructor({ accessTokenProvider, fetchImpl } = {}) {
    this.name = "google-search-console";
    this.accessTokenProvider = accessTokenProvider;
    this.fetchImpl = fetchImpl || globalThis.fetch;
  }

  isConfigured() {
    return typeof this.accessTokenProvider === "function" && typeof this.fetchImpl === "function";
  }

  async submitSitemap({ siteUrl, sitemapUrl } = {}) {
    const target = validateSearchConsoleSubmissionTarget({ siteUrl, sitemapUrl });
    if (!this.isConfigured()) {
      const error = new Error("Le provider Google Search Console n’est pas configuré.");
      error.code = "SEARCH_CONSOLE_PROVIDER_NOT_CONFIGURED";
      error.statusCode = 503;
      throw error;
    }

    const accessToken = String(await this.accessTokenProvider() || "").trim();
    if (!accessToken) {
      const error = new Error("Jeton OAuth Search Console indisponible.");
      error.code = "SEARCH_CONSOLE_ACCESS_TOKEN_UNAVAILABLE";
      error.statusCode = 503;
      throw error;
    }

    const endpoint = `${SEARCH_CONSOLE_API_ROOT}/sites/${encodeURIComponent(target.siteUrl)}/sitemaps/${encodeURIComponent(target.sitemapUrl)}`;
    const response = await this.fetchImpl(endpoint, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response?.ok) {
      let details = null;
      try {
        details = await response.json();
      } catch (_error) {
        details = null;
      }
      const error = new Error(`Search Console a refusé la soumission du sitemap (${response?.status || "inconnu"}).`);
      error.code = "SEARCH_CONSOLE_API_ERROR";
      error.statusCode = Number(response?.status || 502);
      error.details = details || {};
      throw error;
    }

    return {
      provider: this.name,
      siteUrl: target.siteUrl,
      sitemapUrl: target.sitemapUrl,
      submittedAt: new Date().toISOString(),
      httpStatus: Number(response.status || 200),
    };
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
  SEARCH_CONSOLE_API_ROOT,
  DisabledSearchConsoleProvider,
  GoogleSearchConsoleProvider,
  validateSearchConsoleSubmissionTarget,
};