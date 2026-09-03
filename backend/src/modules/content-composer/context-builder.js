"use strict";

function clean(
  value
) {
  if (
    value ===
      undefined ||
    value ===
      null ||
    value ===
      ""
  ) {
    return null;
  }

  return value;
}

function buildComposerContext({
  agency,
  site,
  brandProfile,
  seo,
  template,
}) {
  return {
    agency: {
      id:
        agency.id,

      name:
        clean(
          agency.name
        ),

      city:
        clean(
          agency.city
        ),

      postalCode:
        clean(
          agency.postalCode
        ),

      address:
        clean(
          agency.address
        ),

      phone:
        clean(
          agency.phone
        ),

      email:
        clean(
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
    },

    site: {
      id:
        site?.id ||
        null,

      slug:
        site?.slug ||
        null,

      status:
        site?.status ||
        null,
    },

    brand: {
      primaryColor:
        brandProfile?.primaryColor ||
        null,

      secondaryColor:
        brandProfile?.secondaryColor ||
        null,

      accentColor:
        brandProfile?.accentColor ||
        null,

      tone:
        brandProfile?.tone ||
        null,

      positioning:
        brandProfile?.positioning ||
        null,
    },

    seo: {
      primaryKeyword:
        seo?.primaryKeyword ||
        null,

      secondaryKeywords:
        Array.isArray(
          seo?.secondaryKeywords
        )
          ? seo.secondaryKeywords
          : [],

      targetLocation:
        seo?.targetLocation ||
        agency.city ||
        null,
    },

    template: {
      id:
        template?.id ||
        null,

      name:
        template?.name ||
        null,

      pageType:
        template?.pageType ||
        null,

      variant:
        template?.variant ||
        "default",

      version:
        template?.version ||
        null,
    },
  };
}

module.exports = {
  buildComposerContext,
};
