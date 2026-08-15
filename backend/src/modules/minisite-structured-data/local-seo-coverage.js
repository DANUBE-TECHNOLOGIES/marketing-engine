"use strict";

function normalizeText(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function contentText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(contentText).join(" ");
  if (typeof value === "object") return Object.values(value).map(contentText).join(" ");
  return String(value);
}

function contains(text, term) {
  const haystack = ` ${normalizeText(text)} `;
  const needle = normalizeText(term);
  return Boolean(needle) && haystack.includes(` ${needle} `);
}

function unique(values) {
  return [...new Set((values || []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function localSeoCoverageForSite(site, { targetCities = [] } = {}) {
  const agency = site?.agency || {};
  const primaryCity = String(agency.city || "").trim();
  const cities = unique([primaryCity, ...targetCities]);
  const publishedPages = (site?.pages || []).filter((page) => page?.published === true || String(page?.status || "").toLowerCase() === "published");
  const pageAudits = publishedPages.map((page) => {
    const title = page.seoTitle || page.title || "";
    const meta = page.metaDescription || "";
    const body = (page.blocks || []).map((block) => contentText(block?.content)).join(" ");
    const combined = `${title} ${meta} ${body}`;
    return {
      slug: page.slug,
      title,
      hasPrimaryCityInTitle: primaryCity ? contains(title, primaryCity) : false,
      hasPrimaryCityInMeta: primaryCity ? contains(meta, primaryCity) : false,
      hasPrimaryCityInContent: primaryCity ? contains(body, primaryCity) : false,
      coveredCities: cities.filter((city) => contains(combined, city)),
    };
  });

  const homepage = pageAudits.find((page) => ["", "/", "accueil", "home"].includes(String(page.slug || "").toLowerCase())) || pageAudits[0] || null;
  const coveredCities = unique(pageAudits.flatMap((page) => page.coveredCities));
  const missingCities = cities.filter((city) => !coveredCities.includes(city));
  const gaps = [];

  if (!primaryCity) gaps.push({ code: "primary-city-missing", severity: "critical", message: "La ville principale de l’agence n’est pas renseignée." });
  if (!publishedPages.length) gaps.push({ code: "published-pages-missing", severity: "critical", message: "Aucune page publiée à auditer." });
  if (primaryCity && homepage && !homepage.hasPrimaryCityInTitle) gaps.push({ code: "homepage-title-locality-missing", severity: "high", message: `La page principale ne mentionne pas ${primaryCity} dans son title SEO.` });
  if (primaryCity && homepage && !homepage.hasPrimaryCityInMeta) gaps.push({ code: "homepage-meta-locality-missing", severity: "medium", message: `La meta description principale ne mentionne pas ${primaryCity}.` });
  if (primaryCity && homepage && !homepage.hasPrimaryCityInContent) gaps.push({ code: "homepage-content-locality-missing", severity: "high", message: `Le contenu principal ne mentionne pas clairement ${primaryCity}.` });
  for (const city of missingCities) gaps.push({ code: "target-city-uncovered", severity: city === primaryCity ? "high" : "medium", city, message: `La zone cible ${city} n’est couverte par aucune page publiée.` });

  let score = 100;
  for (const gap of gaps) score -= gap.severity === "critical" ? 35 : gap.severity === "high" ? 20 : 10;
  score = Math.max(0, score);

  return {
    siteSlug: site?.slug || null,
    agencyName: agency.name || null,
    primaryCity: primaryCity || null,
    targetCities: cities,
    coveredCities,
    missingCities,
    publishedPageCount: publishedPages.length,
    score,
    status: score >= 85 ? "strong" : score >= 65 ? "improvable" : "weak",
    gaps,
    pages: pageAudits,
  };
}

function auditLocalSeoCoverage(sites, contexts = {}) {
  const items = (sites || []).map((site) => localSeoCoverageForSite(site, { targetCities: contexts?.[site.slug]?.targetCities || [] }));
  return {
    version: "mse-25.24",
    summary: {
      siteCount: items.length,
      strong: items.filter((item) => item.status === "strong").length,
      improvable: items.filter((item) => item.status === "improvable").length,
      weak: items.filter((item) => item.status === "weak").length,
      averageScore: items.length ? Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length) : 0,
    },
    sites: items,
  };
}

module.exports = { normalizeText, contentText, localSeoCoverageForSite, auditLocalSeoCoverage };
