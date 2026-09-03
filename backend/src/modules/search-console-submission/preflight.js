"use strict";

const { siteSitemapPublicUrl } = require("./service");

async function fetchPublicSitemapXml({ sitemapUrl, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    const error = new Error("Fetch HTTP indisponible pour vérifier le sitemap public.");
    error.code = "SEARCH_CONSOLE_PREFLIGHT_FETCH_UNAVAILABLE";
    error.statusCode = 503;
    throw error;
  }

  let response;
  try {
    response = await fetchImpl(sitemapUrl, {
      method: "GET",
      headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1" },
      signal: AbortSignal.timeout(8000),
    });
  } catch (cause) {
    const error = new Error("Le sitemap public est inaccessible depuis le backend.");
    error.code = "SEARCH_CONSOLE_PUBLIC_SITEMAP_UNREACHABLE";
    error.statusCode = 503;
    error.details = { sitemapUrl };
    error.cause = cause;
    throw error;
  }

  const contentType = String(response?.headers?.get?.("content-type") || "").toLowerCase();
  const body = response?.ok ? await response.text() : "";
  const validXml = response?.ok
    && (contentType.includes("xml") || /^\s*<\?xml/i.test(body))
    && /<urlset\b/i.test(body);

  if (!validXml) {
    const error = new Error("Le sitemap public ne répond pas avec un document XML sitemap valide.");
    error.code = "SEARCH_CONSOLE_PUBLIC_SITEMAP_INVALID";
    error.statusCode = 409;
    error.details = {
      sitemapUrl,
      httpStatus: Number(response?.status || 0),
      contentType: contentType || null,
    };
    throw error;
  }

  return {
    sitemapUrl,
    httpStatus: Number(response.status || 200),
    contentType: contentType || "application/xml",
    reachable: true,
  };
}

async function runSearchConsolePreflight({
  tenantId,
  siteSlug,
  siteUrl,
  structuredDataService,
  provider,
  fetchImpl,
} = {}) {
  if (!structuredDataService) throw new Error("Structured data service requis");
  if (!provider) throw new Error("Search Console provider requis");

  const candidate = await structuredDataService.siteSitemapCandidate({ tenantId, siteSlug });
  if (!candidate.readyToSubmit) {
    const error = new Error("Le mini-site n’est pas prêt pour une soumission Search Console.");
    error.code = "SEARCH_CONSOLE_INDEXATION_NOT_READY";
    error.statusCode = 409;
    error.details = candidate.readiness;
    throw error;
  }

  const sitemapUrl = siteSitemapPublicUrl(structuredDataService.publicOrigin, siteSlug);
  const sitemap = await fetchPublicSitemapXml({ sitemapUrl, fetchImpl });
  const property = await provider.assertSiteOwner(siteUrl);

  return {
    ready: true,
    siteSlug: String(siteSlug || "").trim(),
    siteUrl: String(siteUrl || "").trim(),
    sitemapUrl,
    indexationReadiness: candidate.readiness,
    entryCount: candidate.entryCount,
    publicSitemap: sitemap,
    searchConsoleProperty: {
      siteUrl: property?.siteUrl || null,
      permissionLevel: property?.permissionLevel || null,
      owner: property?.permissionLevel === "siteOwner",
    },
  };
}

module.exports = {
  fetchPublicSitemapXml,
  runSearchConsolePreflight,
};