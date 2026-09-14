import { absoluteUrl } from "./site-url";
import { resolvedTargetCities } from "./local-area-config";
import { isoDate } from "./page-semantics-schema";
import {
  buildGoogleMapsSearchUrl,
} from "../public-agency-location";
import {
  getSectionContent,
  getSectionType,
  isSectionVisible,
} from "../../components/page-builder/shared/blockUtils";

const SERVICE_SECTION_TYPES = new Set([
  "services",
  "services-grid",
  "services-highlight",
]);

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
  const primaryCity = String(agency?.city || site?.city || "").trim();
  const values = resolvedTargetCities(site, { limit: 12 });
  const result = [];
  const seen = new Set();

  function append(value) {
    const name = String(
      typeof value === "string"
        ? value
        : value?.name || value?.city || ""
    ).trim();

    if (!name) return;

    const key = name.toLocaleLowerCase("fr-FR");
    if (seen.has(key)) return;

    seen.add(key);
    result.push({
      "@type": "City",
      name,
    });
  }

  append(primaryCity);
  values.forEach(append);

  return result;
}

function internationalPhone(value) {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const compact = raw.replace(/[^\d+]/g, "");
  if (compact.startsWith("+")) return compact;
  if (/^0\d{9}$/.test(compact)) return `+33${compact.slice(1)}`;
  return raw;
}

function physicalPostalAddress(site, agency) {
  const streetAddress = String(agency?.address || site?.address || "").trim();
  const postalCode = String(agency?.postalCode || site?.postalCode || "").trim();
  const addressLocality = String(agency?.city || site?.city || "").trim();

  if (!streetAddress || !postalCode || !addressLocality) {
    return null;
  }

  return {
    "@type": "PostalAddress",
    streetAddress,
    postalCode,
    addressLocality,
    addressRegion: agency?.region || site?.region,
    addressCountry: "FR",
  };
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

function schemaImage(page, site) {
  const direct = [
    page?.openGraphImageUrl,
    page?.ogImageUrl,
    page?.heroImageUrl,
  ].find((value) => typeof value === "string" && value.trim());

  if (direct) return absoluteUrl(direct);

  const entries = Array.isArray(page?.blocks)
    ? page.blocks
    : Array.isArray(page?.sections)
      ? page.sections
      : [];

  for (const entry of entries) {
    const content = sectionContent(entry);
    const candidate = [
      content.imageUrl,
      content.image,
      content.heroImageUrl,
      content.backgroundImage,
    ].find((value) => typeof value === "string" && value.trim());

    if (candidate) return absoluteUrl(candidate);
  }

  const agency = site?.agency || {};
  const fallback = [
    site?.heroImageUrl,
    agency?.imageUrl,
    agency?.logoUrl,
    site?.logoUrl,
  ].find((value) => typeof value === "string" && value.trim());

  return fallback ? absoluteUrl(fallback) : undefined;
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
    if (!isSectionVisible(entry)) continue;

    const content = getSectionContent(entry);
    const explicitServices = Array.isArray(content.services)
      ? content.services
      : null;
    const sectionType = getSectionType(entry);

    /*
     * A generic visible block can legitimately expose an `items` array
     * (navigation, introduction, cards, etc.) without those items being
     * commercial services. Only service-semantic blocks may promote
     * generic items/cards into Service entities. Other block types must
     * opt in explicitly through `content.services`.
     */
    if (!explicitServices && !SERVICE_SECTION_TYPES.has(sectionType)) {
      continue;
    }

    const items =
      explicitServices ||
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

function uniqueUrls(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function agencyEntityReference(site) {
  return {
    "@type": "TravelAgency",
    "@id": `${absoluteUrl(site.basePath)}#travel-agency`,
    name: site.name || site?.agency?.name,
    url: absoluteUrl(site.basePath),
  };
}

function webPageEntityReference(url) {
  const pageUrl = absoluteUrl(url);
  return {
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
  };
}

function serviceEntityId(url, name) {
  const key = String(name || "")
    .trim()
    .replace(/\s+/g, "-")
    .toLocaleLowerCase("fr-FR");

  return key ? `${url}#service-${encodeURIComponent(key)}` : undefined;
}

export function destinationPracticalProperties(destination) {
  const facts = [
    ["Meilleure période", destination?.bestTime],
    ["Durée idéale", destination?.idealDuration],
    ["Langue", destination?.language],
    ["Monnaie", destination?.currency],
  ];

  return facts
    .map(([name, rawValue]) => [name, String(rawValue || "").trim()])
    .filter(([, value]) => value)
    .map(([name, value]) => ({
      "@type": "PropertyValue",
      name,
      value,
    }));
}

export function destinationHighlightProperties(destination) {
  const highlights = Array.isArray(destination?.highlights)
    ? destination.highlights
    : [];
  const seen = new Set();

  return highlights
    .map((value) => String(value || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLocaleLowerCase("fr-FR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12)
    .map((value) => ({
      "@type": "PropertyValue",
      name: "Point fort",
      value,
    }));
}

export function destinationPublicProperties(destination) {
  const type = String(destination?.type || "").replace(/\s+/g, " ").trim();

  return type
    ? [{
        "@type": "PropertyValue",
        name: "Type de voyage",
        value: type,
      }]
    : [];
}

export function destinationContainedInPlace(destination) {
  const country = String(destination?.country || "").replace(/\s+/g, " ").trim();
  const region = String(destination?.region || "").replace(/\s+/g, " ").trim();

  if (region) {
    return {
      "@type": "Place",
      name: region,
      containedInPlace: country
        ? {
            "@type": "Country",
            name: country,
          }
        : undefined,
    };
  }

  return country
    ? {
        "@type": "Country",
        name: country,
      }
    : undefined;
}

export function buildTravelAgencySchema(site) {
  const agency = site?.agency || site;
  const address = physicalPostalAddress(site, agency);
  const isPhysicalAgency = Boolean(address);
  const latitude = agency?.latitude ?? site?.latitude;
  const longitude = agency?.longitude ?? site?.longitude;
  const phone = internationalPhone(agency.phone || site.phone);
  const email = agency.email || site.email;
  const logo = agency.logoUrl || site.logoUrl;
  const image =
    agency.imageUrl ||
    logo ||
    site.heroImageUrl;
  const hasMap = isPhysicalAgency
    ? agency.googleMapsUrl ||
      buildGoogleMapsSearchUrl({
        name: site.name || agency.name,
        address: address.streetAddress,
        postalCode: address.postalCode,
        city: address.addressLocality,
      })
    : undefined;
  const sameAs = uniqueUrls([
    agency.website,
    agency.googleBusinessUrl,
    agency.googleMapsUrl,
    agency.facebookUrl,
    agency.instagramUrl,
    agency.linkedinUrl,
  ]);

  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": isPhysicalAgency ? ["TravelAgency", "LocalBusiness"] : "TravelAgency",
    "@id": `${absoluteUrl(site.basePath)}#travel-agency`,
    name: site.name || agency.name,
    url: absoluteUrl(site.basePath),
    mainEntityOfPage: webPageEntityReference(site.basePath),
    telephone: phone,
    email,
    logo: logo ? absoluteUrl(logo) : undefined,
    image: image ? absoluteUrl(image) : undefined,
    description: agency.description || site.description,
    address: address || undefined,
    geo:
      isPhysicalAgency && latitude != null && longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude,
            longitude,
          }
        : undefined,
    hasMap,
    areaServed: servedAreas(site, agency),
    openingHoursSpecification: openingHoursSpecification(site?.hours || agency?.hours),
    contactPoint:
      phone || email
        ? {
            "@type": "ContactPoint",
            telephone: phone,
            email,
            contactType: "customer service",
            availableLanguage: ["fr"],
          }
        : undefined,
    sameAs,
  });
}

export function buildLocalWebPageSchema({
  site,
  page,
  url,
  title,
  description,
  image,
}) {
  const pageUrl = absoluteUrl(url);
  const agency = agencyEntityReference(site);
  const pageImage = image ? absoluteUrl(image) : schemaImage(page, site);

  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: title || page?.title,
    description,
    inLanguage: "fr-FR",
    primaryImageOfPage: pageImage
      ? {
          "@type": "ImageObject",
          url: pageImage,
        }
      : undefined,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${absoluteUrl("/")}#website`,
      url: absoluteUrl("/"),
      name: "Mondescale Voyages",
    },
    publisher: agency,
    about: agency,
    mainEntity: agency,
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
        "@id": serviceEntityId(url, service.name),
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
  const pageUrl = absoluteUrl(data.canonicalPath);
  const additionalProperty = [
    ...destinationPracticalProperties(destination),
    ...destinationHighlightProperties(destination),
    ...destinationPublicProperties(destination),
  ];

  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${pageUrl}#destination`,
    name: destination.name,
    description:
      destination.seoDescription ||
      destination.summary ||
      destination.tagline,
    url: pageUrl,
    mainEntityOfPage: webPageEntityReference(data.canonicalPath),
    image: destination.heroImageUrl ? absoluteUrl(destination.heroImageUrl) : undefined,
    additionalProperty,
    geo:
      destination.latitude != null &&
      destination.longitude != null
        ? {
            "@type": "GeoCoordinates",
            latitude: destination.latitude,
            longitude: destination.longitude,
          }
        : undefined,
    containedInPlace: destinationContainedInPlace(destination),
    provider: site
      ? agencyEntityReference(site)
      : undefined,
  });
}

export function buildDestinationWebPageSchema(data) {
  const destination = data?.destination || {};
  const site = data?.site || {};
  const pageUrl = absoluteUrl(data?.canonicalPath);
  const destinationId = `${pageUrl}#destination`;
  const agency = agencyEntityReference(site);
  const destinationEntity = {
    "@type": "TouristDestination",
    "@id": destinationId,
    name: destination.name,
    url: pageUrl,
  };
  const description =
    destination.seoDescription ||
    destination.summary ||
    destination.tagline;
  const datePublished = isoDate(destination.publishedAt || destination.createdAt);
  const dateModified = isoDate(destination.updatedAt || destination.publishedAt || destination.createdAt);

  return compactJsonLd({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${pageUrl}#webpage`,
    url: pageUrl,
    name: destination.name
      ? `Voyage à ${destination.name}${site?.agency?.city ? ` depuis ${site.agency.city}` : ""}`
      : undefined,
    description,
    inLanguage: "fr-FR",
    datePublished,
    dateModified,
    isPartOf: {
      "@type": "WebSite",
      "@id": `${absoluteUrl("/")}#website`,
      url: absoluteUrl("/"),
      name: "Mondescale Voyages",
    },
    primaryImageOfPage: destination.heroImageUrl
      ? {
          "@type": "ImageObject",
          url: absoluteUrl(destination.heroImageUrl),
        }
      : undefined,
    publisher: agency,
    about: [destinationEntity, agency],
    mainEntity: destinationEntity,
  });
}

export {
  agencyEntityReference,
  internationalPhone,
  openingHoursSpecification,
  physicalPostalAddress,
  schemaImage,
  servedAreas,
  serviceEntityId,
  uniqueUrls,
  webPageEntityReference,
};