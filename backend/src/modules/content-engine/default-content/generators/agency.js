"use strict";

const {
  DEFAULT_TRUST_ITEMS,
} =
  require(
    "../constants"
  );

const {
  primaryContactCta,
} =
  require(
    "../cta-factory"
  );

function agencySections(
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
          "Notre agence",

        introduction:
          `Bienvenue chez ${agency.name}, votre interlocuteur local pour préparer vos voyages.`,
      },
    },

    {
      sectionType:
        "agency-story",

      displayOrder:
        20,

      content: {
        title:
          `Votre projet commence à ${agency.city}`,

        body:
          `${agency.name} accompagne les voyageurs dans la préparation de séjours en France et à l'étranger. Notre rôle est de comprendre votre projet, comparer les solutions disponibles et vous conseiller pour construire un voyage cohérent avec vos attentes.`,
      },
    },

    {
      sectionType:
        "agency-details",

      displayOrder:
        30,

      content: {
        title:
          "Retrouvez-nous",

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
      },
    },

    {
      sectionType:
        "trust",

      displayOrder:
        40,

      content: {
        title:
          "L'accompagnement de votre agence",

        items:
          DEFAULT_TRUST_ITEMS,
      },
    },

    {
      sectionType:
        "contact-cta",

      displayOrder:
        50,

      content: {
        title:
          "Parlons de votre prochain voyage",

        body:
          "Prenez contact avec notre équipe pour nous présenter votre projet.",

        primaryCta:
          primaryContactCta(),
      },
    },
  ];
}

module.exports = {
  agencySections,
};
