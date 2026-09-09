import { verifiedCatalogAgencyPartners } from "../../components/page-builder/shared/agencyPartnerSelection";
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
  const entryIds = new Set(entries.map((entry) => entry.id));
  const agencySelections = verifiedCatalogAgencyPartners(site, { max: 3 })
    .filter((partner) => entryIds.has(clean(partner.catalogPartnerId)));

  const schemas = [
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

  if (agencySelections.length) {
    const agencyUrl = absoluteUrl(site?.basePath || `/agence/${encodeURIComponent(site?.slug || "")}`);
    schemas.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${url}#agency-partner-selection`,
      name: `Partenaires sélectionnés par ${clean(site?.name || site?.agency?.name || "cette agence")}`,
      about: {
        "@type": "TravelAgency",
        "@id": `${agencyUrl}#travel-agency`,
        name: clean(site?.name || site?.agency?.name),
        url: agencyUrl,
      },
      numberOfItems: agencySelections.length,
      itemListElement: agencySelections.map((partner, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: clean(partner.name),
        item: {
          "@type": "Organization",
          "@id": `${url}#partner-${encodeURIComponent(clean(partner.catalogPartnerId))}`,
          name: clean(partner.name),
        },
      })),
    });
  }

  return schemas;
}
