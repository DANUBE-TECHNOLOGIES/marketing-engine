import { absoluteUrl } from "./site-url";

export function compactJsonLd(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (item === undefined || item === null || item === "") {
        return undefined;
      }

      if (Array.isArray(item) && item.length === 0) {
        return undefined;
      }

      return item;
    })
  );
}

export function buildWebSiteSchema() {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    url: absoluteUrl("/"),
    name: "Mondescale Voyages",
    inLanguage: "fr-FR",
  });
}

export function buildTravelAgencySchema(site) {
  const agency = site?.agency || site;

  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": `${absoluteUrl(site.basePath)}#travel-agency`,
    name: site.name || agency.name,
    url: absoluteUrl(site.basePath),
    telephone: agency.phone || site.phone,
    email: agency.email || site.email,
    image:
      agency.imageUrl ||
      agency.logoUrl ||
      site.logoUrl ||
      site.heroImageUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: agency.address || site.address,
      postalCode: agency.postalCode || site.postalCode,
      addressLocality: agency.city || site.city,
      addressCountry: "FR",
    },
    areaServed:
      site.targetCities ||
      site.metadata?.targetCities ||
      agency.targetCities,
    sameAs: [
      agency.website,
      agency.googleReviewUrl,
      agency.facebookUrl,
      agency.instagramUrl,
    ].filter(Boolean),
  });
}

export function buildBreadcrumbSchema(items) {
  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  });
}

export function buildDestinationSchema(data) {
  const destination = data.destination;
  const site = data.site;

  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${absoluteUrl(data.canonicalPath)}#destination`,
    name: destination.name,
    description:
      destination.seoDescription ||
      destination.summary ||
      destination.tagline,
    url: absoluteUrl(data.canonicalPath),
    image: destination.heroImageUrl,
    touristType: destination.audiences,
    geo:
      destination.latitude != null &&
      destination.longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude: destination.latitude,
            longitude: destination.longitude,
          }
        : undefined,
    containedInPlace: destination.country
      ? {
          "@type": "Country",
          name: destination.country,
        }
      : undefined,
    provider: site
      ? {
          "@type": "TravelAgency",
          name: site.name,
          url: absoluteUrl(site.basePath),
        }
      : undefined,
  });
}
