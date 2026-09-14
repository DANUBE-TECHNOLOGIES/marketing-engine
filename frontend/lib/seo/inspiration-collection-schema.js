import { absoluteUrl } from "./site-url";

export function inspirationVisiblePath(siteSlug, item) {
  const slug = String(item?.slug || "").trim();
  if (!siteSlug || !slug) return null;
  return `/agence/${encodeURIComponent(siteSlug)}/inspiration/${encodeURIComponent(slug)}`;
}

export function inspirationCanonicalPath(siteSlug, item) {
  const canonicalSiteSlug = String(item?.editorialCanonical?.siteSlug || siteSlug || "").trim();
  return inspirationVisiblePath(canonicalSiteSlug, item);
}

export function buildInspirationCollectionSchemas({ siteSlug, items = [] }) {
  const entries = [];
  const seen = new Set();

  for (const item of Array.isArray(items) ? items : []) {
    const name = String(item?.title || "").replace(/\s+/g, " ").trim();
    const visiblePath = inspirationVisiblePath(siteSlug, item);
    const canonicalPath = inspirationCanonicalPath(siteSlug, item);
    if (!name || !visiblePath || !canonicalPath) continue;

    const canonicalUrl = absoluteUrl(canonicalPath);
    const visibleUrl = absoluteUrl(visiblePath);
    const key = canonicalUrl.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) continue;
    seen.add(key);

    entries.push({
      name,
      visibleUrl,
      canonicalUrl,
    });
  }

  const publicEntries = entries.slice(0, 24);
  if (!publicEntries.length) return [];

  const pageUrl = absoluteUrl(`/agence/${encodeURIComponent(siteSlug)}/inspiration`);
  const listId = `${pageUrl}#inspiration-list`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      mainEntity: {
        "@type": "ItemList",
        "@id": listId,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": listId,
      numberOfItems: publicEntries.length,
      itemListElement: publicEntries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.name,
        url: entry.visibleUrl,
        item: {
          "@type": "Article",
          "@id": `${entry.canonicalUrl}#article`,
          headline: entry.name,
          url: entry.canonicalUrl,
        },
      })),
    },
  ];
}
