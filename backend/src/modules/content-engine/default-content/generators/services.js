"use strict";

const {
  DEFAULT_SERVICES,
} =
  require(
    "../constants"
  );

const {
  quoteCta,
} =
  require(
    "../cta-factory"
  );

function servicesSections(
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
          agency.city,

        title:
          "Nos services voyage",

        introduction:
          `${agency.name} vous accompagne pour organiser votre voyage de la première idée jusqu'au départ.`,
      },
    },

    {
      sectionType:
        "services-grid",

      displayOrder:
        20,

      content: {
        title:
          "Une solution pour chaque projet",

        items:
          DEFAULT_SERVICES,
      },
    },

    {
      sectionType:
        "custom-travel",

      displayOrder:
        30,

      content: {
        title:
          "Construisons votre voyage sur mesure",

        body:
          "Dates, rythme, budget, hébergements, transports et expériences : votre conseiller étudie avec vous les différentes possibilités afin de construire un voyage personnalisé.",

        cta:
          quoteCta(),
      },
    },

    {
      sectionType:
        "booking-support",

      displayOrder:
        40,

      content: {
        title:
          "Un interlocuteur avant, pendant et après",

        body:
          "Votre agence centralise votre projet et reste disponible pour répondre à vos questions tout au long de votre parcours.",
      },
    },

    {
      sectionType:
        "contact-cta",

      displayOrder:
        50,

      content: {
        title:
          "Quel voyage souhaitez-vous préparer ?",

        body:
          `Échangez avec ${agency.name} et obtenez une proposition adaptée à votre projet.`,

        primaryCta:
          quoteCta(),
      },
    },
  ];
}

module.exports = {
  servicesSections,
};
