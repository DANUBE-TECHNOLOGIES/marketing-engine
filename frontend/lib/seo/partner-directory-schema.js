import { getPartnerDirectoryCategories } from "../../components/page-builder/shared/fullPartners";
import { getPublishablePartnerProfiles } from "../../components/page-builder/shared/partnerProfile";
import { absoluteUrl } from "./site-url";

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function publishablePartnerDirectoryEntries() {
  const entries = [];
  const seen = new Set();

  for (const category of getPartnerDirectoryCategories()) {
    const partners = getPublishablePartnerProfiles(category.partners);
    for (const partner of partners) {
      const id = clean(partner.id);
      const name = clean(partner.name);
      if (!id || !name || seen.has(id)) continue;
      seen.add(id);
      entries.push({
        id,
        name,
        summary: clean(partner.summary),
        category: clean(category.label),
      });
    }
  }

  return entries;
}

export function buildPartnerDirectorySchemas({ site, pageUrl }) {
  const entries = publishablePartnerDirectoryEntries();
  if (!entries.length) return [];

  const url = absoluteUrl(pageUrl || `/agence/${encodeURIComponent(site?.slug || "")}/partenaires`);
  const listId = `${url}#partner-list`;

  return [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${url}#webpage`,
      url,
      mainEntity: {
        "@type": "ItemList",
        "@id": listId,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": listId,
      numberOfItems: entries.length,
      itemListElement: entries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.name,
        item: {
          "@type": "Organization",
          "@id": `${url}#partner-${encodeURIComponent(entry.id)}`,
          name: entry.name,
          description: entry.summary || undefined,
          additionalType: entry.category || undefined,
        },
      })),
    },
  ];
}
