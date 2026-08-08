"use strict";

const {
  quoteCta,
  phoneCta,
} =
  require(
    "../cta-factory"
  );

function contactSections(
  context
) {
  const {
    agency,
  } =
    context;

  return [
    {
      sectionType:
        "page-header",

      displayOrder:
        10,

      content: {
        eyebrow:
          `Agence de voyages à ${agency.city}`,

        title:
          "Contactez notre agence",

        introduction:
          "Une question, une envie de départ ou un projet précis ? Notre équipe est à votre disposition.",
      },
    },

    {
      sectionType:
        "contact-details",

      displayOrder:
        20,

      content: {
        name:
          agency.name,

        address:
          agency.fullAddress,

        phone:
          agency.phone,

        phoneHref:
          agency.phoneHref,

        email:
          agency.email,

        emailHref:
          agency.emailHref,

        website:
          agency.website ||
          null,
      },
    },

    {
      sectionType:
        "opening-contact",

      displayOrder:
        30,

      content: {
        title:
          "Préparer votre visite",

        body:
          "Contactez l'agence avant votre venue si vous souhaitez réserver un temps d'échange consacré à votre projet.",
      },
    },

    {
      sectionType:
        "map-placeholder",

      displayOrder:
        40,

      content: {
        title:
          "Nous trouver",

        address:
          agency.fullAddress,

        latitude:
          agency.latitude,

        longitude:
          agency.longitude,

        status:
          agency.latitude &&
          agency.longitude
            ? "available"
            : "requires-location",
      },
    },

    {
      sectionType:
        "contact-cta",

      displayOrder:
        50,

      content: {
        title:
          "Commençons votre projet",

        primaryCta:
          quoteCta(),

        phoneCta:
          phoneCta(
            context
          ),
      },
    },
  ];
}

module.exports = {
  contactSections,
};
