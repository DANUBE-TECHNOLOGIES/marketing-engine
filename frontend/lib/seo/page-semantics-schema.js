import { absoluteUrl } from "./site-url";

function clean(value) {
  return String(value || "").trim().toLowerCase();
}

function pageSemanticType(page) {
  const slug = clean(page?.slug);
  const title = clean(page?.title);

  if (["contact", "nous-contacter"].includes(slug) || title.includes("contact")) {
    return "ContactPage";
  }

  if (["agence", "notre-agence", "equipe", "notre-equipe", "team"].includes(slug)) {
    return "AboutPage";
  }

  if (
    ["destinations", "inspiration", "inspirations", "offres", "offers", "promotions"].includes(slug)
  ) {
    return "CollectionPage";
  }

  return null;
}

function isoDate(value) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizedTypes(value) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  const result = [];
  const seen = new Set();

  for (const item of values) {
    const type = String(item || "").trim();
    if (!type || seen.has(type)) continue;
    seen.add(type);
    result.push(type);
  }

  return result;
}

export function buildPageSemanticsSchema({ page, url }) {
  const type = pageSemanticType(page);
  const datePublished = isoDate(page?.publishedAt || page?.createdAt);
  const dateModified = isoDate(page?.updatedAt || page?.modifiedAt || page?.publishedAt);

  if (!type && !datePublished && !dateModified) return null;

  return {
    "@context": "https://schema.org",
    "@id": `${absoluteUrl(url)}#webpage`,
    ...(type ? { "@type": ["WebPage", type] } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified ? { dateModified } : {}),
  };
}

export function mergePageSemanticsIntoWebPage(webPage, semantics) {
  if (!webPage || !semantics) return webPage;
  if (!webPage["@id"] || webPage["@id"] !== semantics["@id"]) return webPage;

  const types = normalizedTypes([
    ...normalizedTypes(webPage["@type"]),
    ...normalizedTypes(semantics["@type"]),
  ]);

  return {
    ...webPage,
    ...(types.length === 1 ? { "@type": types[0] } : types.length ? { "@type": types } : {}),
    ...(semantics.datePublished ? { datePublished: semantics.datePublished } : {}),
    ...(semantics.dateModified ? { dateModified: semantics.dateModified } : {}),
  };
}

export { isoDate, normalizedTypes, pageSemanticType };
