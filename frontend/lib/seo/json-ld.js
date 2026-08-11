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

function internationalPhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const compact = raw.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) return compact;
  if (/^0\d{9}$/.test(compact)) return `+33${compact.slice(1)}`;
  return raw;
}

function sectionContent(section) {
  const candidates = [
    section?.content,
    section?.jsonContent,
    section?.props,
    section?.data,
  ];
  return candidates.find(
    (value) => value && typeof value === "object" && !Array.isArray(value)
  ) || {};
}

export function extractPublishedServices(page) {
  const entries = Array.isArray(page?.blocks)
    ? page.blocks
    : Array.isArray(page?.sections)
      ? page.sections
      : [];
  const seen = new Set();
  const services = [];

  for (const entry of entries) {
    const status = String(entry?.status || "published").toLowerCase();
    if (status === "hidden" || status === "draft") continue;

    const content = sectionContent(entry);
    const items =
      content.services ||
      content.items ||
      content.cards ||
      [];

    if (!Array.isArray(items)) continue;

    for (const item of items) {
      const name = String(item?.title || item?.name || item?.label || "").trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase("fr-FR");
      if (seen.has(key)) continue;
      seen.add(key);
      services.push({
        name,
        description: String(item?.description || item?.text || "").trim() || undefined,
      });
    }
  }

  return services.slice(0, 12);
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
    telephone: internationalPhone(agency.phone || site.phone),
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
      agency.facebookUrl,
      agency.instagramUrl,
      agency.linkedinUrl,
    ].filter(Boolean),
  });
}

export function buildServiceCatalogSchema(site, page) {
  const services = extractPublishedServices(page);
  if (!services.length) return null;

  const url = absoluteUrl(`/agence/${site.slug}/services`);
  const providerId = `${absoluteUrl(site.basePath)}#travel-agency`;

  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${url}#services`,
    name: `Services de ${site.name}`,
    url,
    itemListElement: services.map((service, index) => ({
      "@type": "Offer",
      position: index + 1,
      itemOffered: {
        "@type": "Service",
        name: service.name,
        description: service.description,
        provider: {
          "@type": "TravelAgency",
          "@id": providerId,
          name: site.name,
          url: absoluteUrl(site.basePath),
        },
      },
    })),
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
