"use strict";

const {
  cleanText,
  normalizePhone,
  removeEmpty,
  siteUrl,
} = require("./utils");

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

    sameAs:
      Array.isArray(
        site.sameAs
      )
        ? site.sameAs
            .map(
              cleanText
            )
            .filter(Boolean)
        : [],
  });
}

module.exports = {
  buildPostalAddress,
  buildTravelAgency,
};
