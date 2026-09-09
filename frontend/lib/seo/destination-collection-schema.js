import { absoluteUrl } from "./site-url";
import {
  destinationSiteRoot,
  publicDestinationCollectionItems,
} from "./destination-public-collection";

export function buildDestinationCollectionSchemas({ site, sections = [] }) {
  const items = publicDestinationCollectionItems({ site, sections });
  if (!items.length) return [];

  const path = `${destinationSiteRoot(site)}/destinations`;
  const pageUrl = absoluteUrl(path);
  const listId = `${pageUrl}#destination-list`;

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
      numberOfItems: items.length,
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        url: absoluteUrl(item.href),
        item: {
          "@type": "TouristDestination",
          "@id": `${absoluteUrl(item.href)}#destination`,
          name: item.name,
          url: absoluteUrl(item.href),
        },
      })),
    },
  ];
}
