"use strict";

const {
  weeklySchedule,
} = require(
  "../agency-profile/hours"
);

const {
  cleanText,
  normalizePhone,
  removeEmpty,
  siteUrl,
} = require("./utils");

const SCHEMA_DAYS = {
  SUNDAY:
    "https://schema.org/Sunday",
  MONDAY:
    "https://schema.org/Monday",
  TUESDAY:
    "https://schema.org/Tuesday",
  WEDNESDAY:
    "https://schema.org/Wednesday",
  THURSDAY:
    "https://schema.org/Thursday",
  FRIDAY:
    "https://schema.org/Friday",
  SATURDAY:
    "https://schema.org/Saturday",
};

const MONDESCALE_ORGANIZATION_ID =
  "https://www.mondescale.com/#organization";

function buildPostalAddress(
  agency
) {
  return removeEmpty({
    "@type":
      "PostalAddress",

    streetAddress:
      cleanText(
        agency.address
      ),

    postalCode:
      cleanText(
        agency.postalCode
      ),

    addressLocality:
      cleanText(
        agency.city
      ),

    addressCountry:
      "FR",
  });
}

function buildOpeningHoursSpecification(
  agency
) {
  const regularHours =
    Array.isArray(
      agency?.profile
        ?.regularHours
    )
      ? agency.profile
          .regularHours
      : [];

  return weeklySchedule(
    regularHours
  ).flatMap(
    ({ day, periods }) =>
      periods
        .filter(
          (period) =>
            period.openTime &&
            period.closeTime &&
            SCHEMA_DAYS[day]
        )
        .map(
          (period) => ({
            "@type":
              "OpeningHoursSpecification",

            dayOfWeek:
              SCHEMA_DAYS[day],

            opens:
              period.openTime,

            closes:
              period.closeTime,
          })
        )
  );
}

function isHttpUrl(
  value
) {
  const normalized =
    cleanText(value);

  if (!normalized) {
    return false;
  }

  try {
    const parsed =
      new URL(normalized);

    return (
      parsed.protocol ===
        "http:" ||
      parsed.protocol ===
        "https:"
    );
  } catch {
    return false;
  }
}

function buildSameAs(
  agency,
  site
) {
  const agencyBrandProfile =
    Array.isArray(
      agency?.brandProfiles
    )
      ? agency.brandProfiles[0]
      : null;

  const candidates = [
    ...(Array.isArray(
      site?.sameAs
    )
      ? site.sameAs
      : []),
    agencyBrandProfile
      ?.facebookUrl,
    agencyBrandProfile
      ?.instagramUrl,
    agencyBrandProfile
      ?.linkedinUrl,
    agencyBrandProfile
      ?.youtubeUrl,
  ];

  return [
    ...new Set(
      candidates
        .map(
          cleanText
        )
        .filter(
          isHttpUrl
        )
    ),
  ];
}

function normalizedCityKey(
  value
) {
  const text = cleanText(
    value
  );

  if (!text) {
    return "";
  }

  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

function deduplicateCityNames(
  names
) {
  const seen = new Set();
  const result = [];

  for (const name of names) {
    const cleaned =
      cleanText(name);
    const key =
      normalizedCityKey(
        cleaned
      );

    if (
      !cleaned ||
      !key ||
      seen.has(key)
    ) {
      continue;
    }

    seen.add(key);
    result.push(cleaned);
  }

  return result;
}

function targetCityNames(
  agency
) {
  const primaryCity =
    cleanText(
      agency?.city
    );

  const raw =
    agency?.seoSite
      ?.targetCities;

  let candidates = [];

  if (Array.isArray(raw)) {
    candidates = raw;
  } else if (
    raw &&
    typeof raw === "object"
  ) {
    if (
      Array.isArray(
        raw.cities
      )
    ) {
      candidates = raw.cities;
    } else if (
      Array.isArray(
        raw.items
      )
    ) {
      candidates = raw.items;
    } else if (
      Array.isArray(
        raw.targets
      )
    ) {
      candidates = raw.targets;
    }
  }

  const names =
    candidates
      .map(
        (item) => {
          if (
            typeof item ===
              "string"
          ) {
            return cleanText(
              item
            );
          }

          if (
            !item ||
            typeof item !==
              "object"
          ) {
            return undefined;
          }

          return cleanText(
            item.name ||
            item.city ||
            item.label
          );
        }
      )
      .filter(Boolean);

  return deduplicateCityNames([
    primaryCity,
    ...names,
  ]);
}

function buildAreaServed(
  agency
) {
  return targetCityNames(
    agency
  ).map(
    (name) => ({
      "@type":
        "City",

      name,
    })
  );
}

function buildMondescaleOrganization() {
  return {
    "@type":
      "Organization",

    "@id":
      MONDESCALE_ORGANIZATION_ID,

    name:
      "Mondescale Voyages",

    url:
      "https://www.mondescale.com",
  };
}

function buildTravelAgency({
  agency,
  site,
  publicOrigin,
} = {}) {
  const url =
    siteUrl(
      publicOrigin,
      site.slug
    );

  const id =
    `${url}#travel-agency`;

  const name =
    cleanText(
      agency.name,
      "Agence de voyages"
    );

  const areaServed =
    buildAreaServed(
      agency
    );

  return removeEmpty({
    "@type": [
      "TravelAgency",
      "LocalBusiness",
    ],

    "@id":
      id,

    name,

    url,

    telephone:
      normalizePhone(
        agency.phone
      ),

    email:
      cleanText(
        agency.email
      ),

    address:
      buildPostalAddress(
        agency
      ),

    image:
      cleanText(
        site.logoUrl ||
        site.coverImageUrl
      ),

    logo:
      cleanText(
        site.logoUrl
      ),

    description:
      cleanText(
        site.description ||
        agency.description
      ),

    priceRange:
      "€€",

    areaServed:
      areaServed.length
        ? areaServed
        : undefined,

    parentOrganization:
      {
        "@id":
          MONDESCALE_ORGANIZATION_ID,
      },

    openingHoursSpecification:
      buildOpeningHoursSpecification(
        agency
      ),

    sameAs:
      buildSameAs(
        agency,
        site
      ),
  });
}

module.exports = {
  MONDESCALE_ORGANIZATION_ID,
  buildAreaServed,
  buildMondescaleOrganization,
  buildOpeningHoursSpecification,
  buildPostalAddress,
  buildSameAs,
  buildTravelAgency,
  deduplicateCityNames,
  isHttpUrl,
  normalizedCityKey,
  targetCityNames,
};
