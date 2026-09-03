"use strict";

const {
  quoteCta,
} =
  require(
    "../cta-factory"
  );

function partnersSections(
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
          "Nos partenaires voyage",

        introduction:
          `${agency.name} travaille avec un large réseau de tour-opérateurs, croisiéristes et spécialistes pour comparer les solutions et construire le voyage le plus adapté à votre projet.`,
      },
    },

    {
      sectionType:
        "partner-directory",

      displayOrder:
        20,

      content: {
        title:
          "Tous nos partenaires voyage",

        text:
          "Parcourez nos partenaires par univers de voyage. Chaque fiche présente l'essentiel, avec davantage de détails uniquement si vous souhaitez approfondir.",
      },
    },

    {
      sectionType:
        "contact-cta",

      displayOrder:
        30,

      content: {
        title:
          "Quel partenaire correspond à votre projet ?",

        body:
          `Votre conseiller ${agency.city ? `à ${agency.city}` : "en agence"} compare les offres de plusieurs partenaires pour vous orienter vers la solution la plus adaptée.`,

        primaryCta:
          quoteCta(),
      },
    },
  ];
}

module.exports = {
  partnersSections,
};
