"use strict";

const SEARCH_CONSOLE_API_ROOT = "https://www.googleapis.com/webmasters/v3";
const SEARCH_CONSOLE_OWNER_PERMISSION = "siteOwner";

class DisabledSearchConsoleProvider {
  constructor() {
    this.name = "disabled";
    this.accessMode = "none";
    this.submissionCapable = false;
  }

  isConfigured() { return false; }
  async listSites() { const error = new Error("Le provider Google Search Console n’est pas configuré."); error.code = "SEARCH_CONSOLE_PROVIDER_NOT_CONFIGURED"; error.statusCode = 503; throw error; }
  async assertSiteAccess() { return this.listSites(); }
  async assertSiteOwner() { return this.listSites(); }
  async getSitemap() { return this.listSites(); }
  async submitSitemap() { return this.listSites(); }
}

class GoogleSearchConsoleProvider {
  constructor({ accessTokenProvider, fetchImpl, accessMode = "configured-scope", submissionCapable = true } = {}) {
    this.name = "google-search-console";
    this.accessTokenProvider = accessTokenProvider;
    this.fetchImpl = fetchImpl || globalThis.fetch;
    this.accessMode = accessMode;
    this.submissionCapable = submissionCapable === true;
  }

  isConfigured() { return typeof this.accessTokenProvider === "function" && typeof this.fetchImpl === "function"; }

  async accessToken() {
    if (!this.isConfigured()) { const error = new Error("Le provider Google Search Console n’est pas configuré."); error.code = "SEARCH_CONSOLE_PROVIDER_NOT_CONFIGURED"; error.statusCode = 503; throw error; }
    const accessToken = String(await this.accessTokenProvider() || "").trim();
    if (!accessToken) { const error = new Error("Jeton OAuth Search Console indisponible."); error.code = "SEARCH_CONSOLE_ACCESS_TOKEN_UNAVAILABLE"; error.statusCode = 503; throw error; }
    return accessToken;
  }

  async googleRequest(endpoint, options = {}) {
    const accessToken = await this.accessToken();
    const response = await this.fetchImpl(endpoint, { ...options, headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json", ...(options.headers || {}) } });
    if (!response?.ok) { let details = null; try { details = await response.json(); } catch (_) {} const error = new Error(`Search Console a refusé la requête (${response?.status || "inconnu"}).`); error.code = "SEARCH_CONSOLE_API_ERROR"; error.statusCode = Number(response?.status || 502); error.details = details || {}; throw error; }
    return response;
  }

  async listSites() { const response = await this.googleRequest(`${SEARCH_CONSOLE_API_ROOT}/sites`, { method: "GET" }); const body = await response.json(); return Array.isArray(body?.siteEntry) ? body.siteEntry : []; }

  async assertSiteAccess(siteUrl) {
    const target = String(siteUrl || "").trim();
    if (!target) { const error = new Error("La propriété Search Console est obligatoire."); error.code = "SEARCH_CONSOLE_SITE_URL_REQUIRED"; error.statusCode = 400; throw error; }
    const sites = await this.listSites();
    const property = sites.find((item) => String(item?.siteUrl || "").trim() === target);
    if (!property) { const error = new Error(`La propriété Search Console n’est pas accessible : ${target}`); error.code = "SEARCH_CONSOLE_SITE_NOT_ACCESSIBLE"; error.statusCode = 403; error.details = { siteUrl: target }; throw error; }
    return property;
  }

  async assertSiteOwner(siteUrl) {
    const property = await this.assertSiteAccess(siteUrl);
    const permissionLevel = String(property?.permissionLevel || "").trim();
    if (permissionLevel !== SEARCH_CONSOLE_OWNER_PERMISSION) { const error = new Error(`La propriété Search Console doit être accessible avec les droits propriétaire : ${siteUrl}`); error.code = "SEARCH_CONSOLE_OWNER_PERMISSION_REQUIRED"; error.statusCode = 403; error.details = { siteUrl: String(siteUrl || "").trim(), permissionLevel: permissionLevel || null, requiredPermissionLevel: SEARCH_CONSOLE_OWNER_PERMISSION }; throw error; }
    return property;
  }

  async getSitemap({ siteUrl, sitemapUrl } = {}) {
    const target = validateSearchConsoleSubmissionTarget({ siteUrl, sitemapUrl });
    await this.assertSiteAccess(target.siteUrl);
    const response = await this.googleRequest(`${SEARCH_CONSOLE_API_ROOT}/sites/${encodeURIComponent(target.siteUrl)}/sitemaps/${encodeURIComponent(target.sitemapUrl)}`, { method: "GET" });
    return normalizeSitemapResource(await response.json());
  }

  async submitSitemap({ siteUrl, sitemapUrl } = {}) {
    if (!this.submissionCapable) {
      const error = new Error("Le provider Search Console courant est volontairement en lecture seule. Aucune soumission Google n’est autorisée.");
      error.code = "SEARCH_CONSOLE_PROVIDER_READ_ONLY";
      error.statusCode = 409;
      error.details = { accessMode: this.accessMode, submissionCapable: false };
      throw error;
    }
    const target = validateSearchConsoleSubmissionTarget({ siteUrl, sitemapUrl });
    const property = await this.assertSiteOwner(target.siteUrl);
    const response = await this.googleRequest(`${SEARCH_CONSOLE_API_ROOT}/sites/${encodeURIComponent(target.siteUrl)}/sitemaps/${encodeURIComponent(target.sitemapUrl)}`, { method: "PUT" });
    return { provider: this.name, siteUrl: target.siteUrl, sitemapUrl: target.sitemapUrl, permissionLevel: property.permissionLevel, submittedAt: new Date().toISOString(), httpStatus: Number(response.status || 200) };
  }
}

function normalizeSitemapResource(resource = {}) { return { path: resource?.path || null, lastSubmitted: resource?.lastSubmitted || null, lastDownloaded: resource?.lastDownloaded || null, isPending: resource?.isPending === true, isSitemapsIndex: resource?.isSitemapsIndex === true, type: resource?.type || null, warnings: Number(resource?.warnings || 0), errors: Number(resource?.errors || 0), contents: Array.isArray(resource?.contents) ? resource.contents.map((item) => ({ type: item?.type || null, submitted: Number(item?.submitted || 0) })) : [] }; }
function validateSearchConsoleSubmissionTarget({ siteUrl, sitemapUrl } = {}) { const property = String(siteUrl || "").trim(); const feedpath = String(sitemapUrl || "").trim(); if (!property) { const error = new Error("La propriété Search Console est obligatoire."); error.code = "SEARCH_CONSOLE_SITE_URL_REQUIRED"; error.statusCode = 400; throw error; } if (!feedpath || !/^https:\/\//i.test(feedpath)) { const error = new Error("Une URL HTTPS de sitemap est obligatoire."); error.code = "SEARCH_CONSOLE_SITEMAP_URL_REQUIRED"; error.statusCode = 400; throw error; } return { siteUrl: property, sitemapUrl: feedpath }; }

module.exports = { SEARCH_CONSOLE_API_ROOT, SEARCH_CONSOLE_OWNER_PERMISSION, DisabledSearchConsoleProvider, GoogleSearchConsoleProvider, normalizeSitemapResource, validateSearchConsoleSubmissionTarget };
