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

export { isoDate, pageSemanticType };
