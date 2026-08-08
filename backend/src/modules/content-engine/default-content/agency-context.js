"use strict";

function clean(
  value,
  fallback = ""
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return fallback;
  }

  const normalized =
    String(
      value
    ).trim();

  return normalized ||
    fallback;
}

function addressLine(
  agency = {}
) {
  return [
    clean(
      agency.address
    ),

    [
      clean(
        agency.postalCode
      ),

      clean(
        agency.city
      ),
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      ),
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    );
}

function telephoneHref(
  value
) {
  const normalized =
    clean(
      value
    )
      .replace(
        /[^0-9+]/g,
        ""
      );

  return normalized
    ? `tel:${normalized}`
    : null;
}

function emailHref(
  value
) {
  const normalized =
    clean(
      value
    );

  return normalized
    ? `mailto:${normalized}`
    : null;
}

function buildAgencyContext(
  agency = {},
  site = {}
) {
  const city =
    clean(
      agency.city,
      "votre ville"
    );

  const name =
    clean(
      agency.name,
      `Mondescale ${city}`
    );

  return {
    agency: {
      id:
        agency.id ??
        null,

      name,

      city,

      address:
        clean(
          agency.address
        ),

      postalCode:
        clean(
          agency.postalCode
        ),

      fullAddress:
        addressLine(
          agency
        ),

      phone:
        clean(
          agency.phone
        ),

      phoneHref:
        telephoneHref(
          agency.phone
        ),

      email:
        clean(
          agency.email
        ),

      emailHref:
        emailHref(
          agency.email
        ),

      website:
        clean(
          agency.website
        ),

      googleReviewUrl:
        clean(
          agency.googleReviewUrl
        ),

      latitude:
        agency.latitude ??
        null,

      longitude:
        agency.longitude ??
        null,
    },

    site: {
      id:
        site.id ??
        null,

      name:
        clean(
          site.name,
          name
        ),

      slug:
        clean(
          site.slug
        ),

      basePath:
        clean(
          site.basePath
        ),
    },

    computed: {
      agencyLabel:
        name,

      localAgencyLabel:
        `agence de voyages à ${city}`,

      cityPossessive:
        `de ${city}`,

      contactPath:
        "/contact",

      agencyPath:
        "/agence",

      servicesPath:
        "/services",
    },
  };
}

module.exports = {
  clean,
  addressLine,
  telephoneHref,
  emailHref,
  buildAgencyContext,
};
