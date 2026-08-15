"use strict";

const { buildTravelAgency } = require("./travel-agency");

function normalizeText(value) { return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function contentText(value) { if (value == null) return ""; if (typeof value === "string") return value; if (Array.isArray(value)) return value.map(contentText).join(" "); if (typeof value === "object") return Object.values(value).map(contentText).join(" "); return String(value); }
function contains(text, term) { const haystack = ` ${normalizeText(text)} `; const needle = normalizeText(term); return Boolean(needle) && haystack.includes(` ${needle} `); }
function unique(values) { return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))]; }
function firstHeading(blocks) {
  for (const block of blocks || []) {
    const content = block?.content || {};
    const candidates = [content.h1, content.heading, content.title, content.headline];
    const value = candidates.find((item) => typeof item === "string" && item.trim());
    if (value) return value.trim();
  }
  return "";
}
function extractLinkTargets(value, key = "", targets = []) {
  if (value == null) return targets;
  if (Array.isArray(value)) { for (const item of value) extractLinkTargets(item, key, targets); return targets; }
  if (typeof value === "object") { for (const [childKey, childValue] of Object.entries(value)) extractLinkTargets(childValue, childKey, targets); return targets; }
  if (typeof value !== "string") return targets;
  const linkKey = /(^|_)(href|url|link|linkurl|targeturl|ctaurl|path)$/i.test(String(key || "").replace(/[-\s]/g, ""));
  if (!linkKey) return targets;
  const target = value.trim();
  if (target) targets.push(target);
  return targets;
}
function internalLinkAudit(site, publishedPages, publicOrigin) {
  const basePath = `/agence/${String(site?.slug || "").trim()}`;
  const knownPaths = new Set(publishedPages.map((page) => {
    const slug = String(page?.slug || "").replace(/^\/+|\/+$/g, "");
    return slug && !["accueil", "home"].includes(slug.toLowerCase()) ? `${basePath}/${slug}` : basePath;
  }));
  const inbound = new Map([...knownPaths].map((path) => [path, 0]));
  const pages = publishedPages.map((page) => {
    const links = unique((page.blocks || []).flatMap((block) => extractLinkTargets(block?.content)));
    const internal = [];
    for (const raw of links) {
      let path = raw;
      try {
        if (/^https?:\/\//i.test(raw)) {
          const parsed = new URL(raw);
          const origin = new URL(publicOrigin);
          if (parsed.origin !== origin.origin) continue;
          path = parsed.pathname;
        }
      } catch { continue; }
      if (!path.startsWith("/")) continue;
      const clean = path.replace(/\/+$/g, "") || "/";
      if (clean === basePath || clean.startsWith(`${basePath}/`)) internal.push(clean);
    }
    for (const target of unique(internal)) if (inbound.has(target)) inbound.set(target, inbound.get(target) + 1);
    return { slug: page.slug, internalLinkCount: unique(internal).length, internalLinks: unique(internal) };
  });
  const orphans = [...knownPaths].filter((path) => path !== basePath && Number(inbound.get(path) || 0) === 0);
  return { pageCount: knownPaths.size, linkedPageCount: [...knownPaths].filter((path) => path === basePath || Number(inbound.get(path) || 0) > 0).length, orphanPaths: orphans, hasOrphans: orphans.length > 0, pages };
}
function napAudit(agency) {
  const missing = [];
  if (!String(agency?.name || "").trim()) missing.push("name");
  if (!String(agency?.address || "").trim()) missing.push("address");
  if (!String(agency?.postalCode || "").trim()) missing.push("postalCode");
  if (!String(agency?.city || "").trim()) missing.push("city");
  if (!String(agency?.phone || "").trim()) missing.push("phone");
  return { complete: missing.length === 0, missing };
}
function structuredDataAudit(site, publicOrigin) {
  const node = buildTravelAgency({ agency: site?.agency || {}, site, publicOrigin });
  const types = Array.isArray(node?.["@type"]) ? node["@type"] : [node?.["@type"]].filter(Boolean);
  return { hasTravelAgency: types.includes("TravelAgency"), hasLocalBusiness: types.includes("LocalBusiness"), hasTelephone: Boolean(node?.telephone), hasAddress: Boolean(node?.address?.streetAddress && node?.address?.postalCode && node?.address?.addressLocality), hasAreaServed: Boolean(node?.areaServed?.name), locality: node?.address?.addressLocality || null, areaServed: node?.areaServed?.name || null };
}

function localSeoCoverageForSite(site, { targetCities = [], publicOrigin = "https://agences.mondescale.com" } = {}) {
  const agency = site?.agency || {};
  const primaryCity = String(agency.city || "").trim();
  const cities = unique([primaryCity, ...targetCities]);
  const publishedPages = (site?.pages || []).filter((page) => page?.published === true || String(page?.status || "").toLowerCase() === "published");
  const linking = internalLinkAudit(site, publishedPages, publicOrigin);
  const pageAudits = publishedPages.map((page) => {
    const title = page.seoTitle || page.title || "";
    const meta = page.metaDescription || "";
    const blocks = page.blocks || [];
    const body = blocks.map((block) => contentText(block?.content)).join(" ");
    const h1 = firstHeading(blocks);
    const combined = `${title} ${meta} ${h1} ${body}`;
    const linkInfo = linking.pages.find((item) => String(item.slug || "") === String(page.slug || "")) || { internalLinkCount: 0, internalLinks: [] };
    return { slug: page.slug, title, h1, hasH1: Boolean(h1), hasPrimaryCityInH1: primaryCity ? contains(h1, primaryCity) : false, hasPrimaryCityInTitle: primaryCity ? contains(title, primaryCity) : false, hasPrimaryCityInMeta: primaryCity ? contains(meta, primaryCity) : false, hasPrimaryCityInContent: primaryCity ? contains(body, primaryCity) : false, coveredCities: cities.filter((city) => contains(combined, city)), internalLinkCount: linkInfo.internalLinkCount, internalLinks: linkInfo.internalLinks };
  });
  const homepage = pageAudits.find((page) => ["", "/", "accueil", "home"].includes(String(page.slug || "").toLowerCase())) || pageAudits[0] || null;
  const coveredCities = unique(pageAudits.flatMap((page) => page.coveredCities));
  const missingCities = cities.filter((city) => !coveredCities.includes(city));
  const nap = napAudit(agency);
  const structuredData = structuredDataAudit(site, publicOrigin);
  const gaps = [];

  if (!primaryCity) gaps.push({ code: "primary-city-missing", severity: "critical", message: "La ville principale de l’agence n’est pas renseignée." });
  if (!publishedPages.length) gaps.push({ code: "published-pages-missing", severity: "critical", message: "Aucune page publiée à auditer." });
  if (homepage && !homepage.hasH1) gaps.push({ code: "homepage-h1-missing", severity: "high", message: "La page principale ne possède pas de H1 identifiable." });
  if (primaryCity && homepage?.hasH1 && !homepage.hasPrimaryCityInH1) gaps.push({ code: "homepage-h1-locality-missing", severity: "medium", message: `Le H1 principal ne mentionne pas ${primaryCity}.` });
  if (primaryCity && homepage && !homepage.hasPrimaryCityInTitle) gaps.push({ code: "homepage-title-locality-missing", severity: "high", message: `La page principale ne mentionne pas ${primaryCity} dans son title SEO.` });
  if (primaryCity && homepage && !homepage.hasPrimaryCityInMeta) gaps.push({ code: "homepage-meta-locality-missing", severity: "medium", message: `La meta description principale ne mentionne pas ${primaryCity}.` });
  if (primaryCity && homepage && !homepage.hasPrimaryCityInContent) gaps.push({ code: "homepage-content-locality-missing", severity: "high", message: `Le contenu principal ne mentionne pas clairement ${primaryCity}.` });
  if (!nap.complete) gaps.push({ code: "nap-incomplete", severity: "critical", fields: nap.missing, message: `Les données NAP sont incomplètes : ${nap.missing.join(", ")}.` });
  if (!structuredData.hasTravelAgency || !structuredData.hasLocalBusiness) gaps.push({ code: "local-schema-type-missing", severity: "critical", message: "Les données structurées locales doivent exposer TravelAgency et LocalBusiness." });
  if (!structuredData.hasAddress || !structuredData.hasTelephone) gaps.push({ code: "local-schema-nap-incomplete", severity: "high", message: "Le JSON-LD local ne contient pas une adresse et un téléphone complets." });
  if (primaryCity && structuredData.locality && normalizeText(structuredData.locality) !== normalizeText(primaryCity)) gaps.push({ code: "local-schema-city-mismatch", severity: "critical", message: "La ville du JSON-LD ne correspond pas à la ville principale de l’agence." });
  if (primaryCity && (!structuredData.hasAreaServed || normalizeText(structuredData.areaServed) !== normalizeText(primaryCity))) gaps.push({ code: "local-schema-area-served-mismatch", severity: "medium", message: `Le areaServed doit refléter la zone principale ${primaryCity}.` });
  if (linking.hasOrphans) gaps.push({ code: "internal-link-orphans", severity: "high", paths: linking.orphanPaths, message: `${linking.orphanPaths.length} page(s) publiée(s) ne reçoivent aucun lien interne depuis le mini-site.` });
  if (publishedPages.length > 1 && Number(homepage?.internalLinkCount || 0) === 0) gaps.push({ code: "homepage-internal-links-missing", severity: "medium", message: "La page principale ne crée aucun lien interne vers les autres contenus publiés de l’agence." });
  for (const city of missingCities) gaps.push({ code: "target-city-uncovered", severity: city === primaryCity ? "high" : "medium", city, message: `La zone cible ${city} n’est couverte par aucune page publiée.` });

  let score = 100;
  for (const gap of gaps) score -= gap.severity === "critical" ? 25 : gap.severity === "high" ? 15 : 7;
  score = Math.max(0, score);
  return { siteSlug: site?.slug || null, agencyName: agency.name || null, primaryCity: primaryCity || null, targetCities: cities, coveredCities, missingCities, publishedPageCount: publishedPages.length, nap, structuredData, linking, score, status: score >= 85 ? "strong" : score >= 65 ? "improvable" : "weak", gaps, pages: pageAudits };
}

function auditLocalSeoCoverage(sites, contexts = {}, options = {}) {
  const items = (sites || []).map((site) => localSeoCoverageForSite(site, { targetCities: contexts?.[site.slug]?.targetCities || [], publicOrigin: options.publicOrigin }));
  return { version: "mse-25.24", summary: { siteCount: items.length, strong: items.filter((item) => item.status === "strong").length, improvable: items.filter((item) => item.status === "improvable").length, weak: items.filter((item) => item.status === "weak").length, averageScore: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0, napComplete: items.filter((item) => item.nap.complete).length, structuredDataComplete: items.filter((item) => item.structuredData.hasTravelAgency && item.structuredData.hasLocalBusiness && item.structuredData.hasAddress && item.structuredData.hasTelephone).length, internallyLinked: items.filter((item) => !item.linking.hasOrphans).length }, sites: items };
}

module.exports = { normalizeText, contentText, firstHeading, extractLinkTargets, internalLinkAudit, napAudit, structuredDataAudit, localSeoCoverageForSite, auditLocalSeoCoverage };
