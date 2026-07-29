"use strict";

function absoluteUrl(baseUrl, path) {
  const base = String(baseUrl || "").replace(/\/+$/, "");
  const cleanPath = `/${String(path || "").replace(/^\/+/, "")}`;
  return `${base}${cleanPath}`;
}

function xmlEscape(value) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function buildSitemap({ site, pages = [], baseUrl, includeDrafts = false } = {}) {
  if (!site?.slug) throw new Error("A site with a slug is required");
  if (!baseUrl) throw new Error("baseUrl is required");
  const entries = pages
    .filter((page) => includeDrafts || (page.status === "published" && page.published === true))
    .map((page) => ({
      loc: absoluteUrl(baseUrl, page.path || `${site.basePath || `/agence/${site.slug}`}/${page.slug || ""}`),
      lastmod: new Date(page.updatedAt || page.createdAt || Date.now()).toISOString(),
      changefreq: page.pageType === "home" ? "daily" : "weekly",
      priority: page.pageType === "home" ? "1.0" : page.pageType === "destination" ? "0.8" : "0.7",
    }))
    .sort((a, b) => a.loc.localeCompare(b.loc));

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) => `  <url><loc>${xmlEscape(entry.loc)}</loc><lastmod>${entry.lastmod}</lastmod><changefreq>${entry.changefreq}</changefreq><priority>${entry.priority}</priority></url>`),
    '</urlset>',
  ].join("\n");
  return { version: "1.0", site: { id: site.id, slug: site.slug }, count: entries.length, entries, xml };
}

function buildRobots({ baseUrl, siteSlug } = {}) {
  if (!baseUrl) throw new Error("baseUrl is required");
  const path = siteSlug ? `/public/site-generator/${siteSlug}/sitemap.xml` : "/sitemap.xml";
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(baseUrl, path)}\n`;
}

module.exports = { absoluteUrl, buildSitemap, buildRobots, xmlEscape };
