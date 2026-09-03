"use strict";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeEntry(entry) {
  if (!entry?.url) return null;
  return {
    url: String(entry.url).trim(),
    lastModified: entry.lastModified || null,
    changeFrequency: entry.changeFrequency || null,
    priority: entry.priority ?? null,
  };
}

function renderUrlEntry(entry) {
  const item = normalizeEntry(entry);
  if (!item?.url) return "";

  const lines = ["  <url>", `    <loc>${escapeXml(item.url)}</loc>`];
  if (item.lastModified) lines.push(`    <lastmod>${escapeXml(item.lastModified)}</lastmod>`);
  if (item.changeFrequency) lines.push(`    <changefreq>${escapeXml(item.changeFrequency)}</changefreq>`);
  if (item.priority !== null && item.priority !== undefined) {
    lines.push(`    <priority>${escapeXml(item.priority)}</priority>`);
  }
  lines.push("  </url>");
  return lines.join("\n");
}

function renderSitemapXml(entries = []) {
  const body = (entries || [])
    .map(renderUrlEntry)
    .filter(Boolean)
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
  ].filter((line) => line !== "").join("\n");
}

function entriesForSite(sitemap, siteSlug) {
  const slug = String(siteSlug || "").trim();
  return (sitemap?.entries || []).filter(
    (entry) => String(entry?.siteSlug || "").trim() === slug
  );
}

module.exports = {
  entriesForSite,
  escapeXml,
  normalizeEntry,
  renderSitemapXml,
  renderUrlEntry,
};
