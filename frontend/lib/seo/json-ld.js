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

function normalizeFrenchPhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;

  const compact = raw.replace(/[\s.()-]/g, "");
  if (/^\+33\d{9}$/.test(compact)) return compact;
  if (/^0033\d{9}$/.test(compact)) return `+${compact.slice(2)}`;
  if (/^0\d{9}$/.test(compact)) return `+33${compact.slice(1)}`;
  return raw;
}

function openingHoursSpecification(hours) {
  const weekly = Array.isArray(hours?.weekly) ? hours.weekly : [];

  return weekly.flatMap((day) => {
    const periods = Array.isArray(day?.periods) ? day.periods : [];
    return periods
      .filter((period) => period?.openTime && period?.closeTime)
      .map((period) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${String(day.day || "")
          .toLowerCase()
          .replace(/^./, (value) => value.toUpperCase())}`,
        opens: period.openTime,
        closes: period.closeTime,
      }));
  });
}

function servedAreas(site, agency) {
  const values =
    site?.targetCities ||
    site?.metadata?.targetCities ||
    agency?.targetCities ||
    [];

  if (!Array.isArray(values)) return values;

  return values.map((value) =>
    typeof value === "string"
      ? { "@type": "City", name: value }
      : value
  );
}

export function buildTravelAgencySchema(site) {
  const agency = site?.agency || site;
  const latitude = agency?.latitude ?? site?.latitude;
  const longitude = agency?.longitude ?? site?.longitude;

  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": ["TravelAgency", "LocalBusiness"],
    "@id": `${absoluteUrl(site.basePath)}#travel-agency`,
    name: site.name || agency.name,
    url: absoluteUrl(site.basePath),
    telephone: normalizeFrenchPhone(agency.phone || site.phone),
    email: agency.email || site.email,
    image:
      agency.imageUrl ||
      agency.logoUrl ||
      site.logoUrl ||
      site.heroImageUrl,
    description: agency.description || site.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: agency.address || site.address,
      postalCode: agency.postalCode || site.postalCode,
      addressLocality: agency.city || site.city,
      addressRegion: agency.region || site.region,
      addressCountry: "FR",
    },
    geo:
      latitude != null && longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude,
            longitude,
          }
        : undefined,
    areaServed: servedAreas(site, agency),
    openingHoursSpecification: openingHoursSpecification(site?.hours),
    sameAs: [
      agency.website,
      agency.googleBusinessUrl,
      agency.googleMapsUrl,
      agency.googleReviewUrl,
      agency.facebookUrl,
      agency.instagramUrl,
      agency.linkedinUrl,
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
          "@id": `${absoluteUrl(site.basePath)}#travel-agency`,
          name: site.name,
          url: absoluteUrl(site.basePath),
        }
      : undefined,
  });
}

export { normalizeFrenchPhone };
