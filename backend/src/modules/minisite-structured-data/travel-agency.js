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
        .filter(Boolean)
    ),
  ];
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
      cleanText(
        agency.city
      )
        ? {
            "@type":
              "City",

            name:
              cleanText(
                agency.city
              ),
          }
        : undefined,

    parentOrganization:
      {
        "@type":
          "Organization",

        name:
          "Mondescale Voyages",

        url:
          "https://www.mondescale.com",
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
  buildOpeningHoursSpecification,
  buildPostalAddress,
  buildSameAs,
  buildTravelAgency,
};
