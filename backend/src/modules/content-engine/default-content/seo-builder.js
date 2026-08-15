"use strict";

function truncate(
  value,
  max
) {
  const normalized =
    String(
      value ||
      ""
    ).trim();

  if (
    normalized.length <=
    max
  ) {
    return normalized;
  }

  return normalized
    .slice(
      0,
      max - 1
    )
    .trimEnd() +
    "…";
}

function buildGeneralSeo(
  pageType,
  context
) {
  const {
    agency,
  } =
    context;

  switch (
    String(
      pageType ||
      ""
    ).toUpperCase()
  ) {
    case "HOME":
      return {
        title:
          truncate(
            `Agence de voyages à ${agency.city} | ${agency.name}`,
            65
          ),

        description:
          truncate(
            `Préparez votre prochain voyage avec ${agency.name}, votre agence de voyages à ${agency.city}. Séjours, circuits, croisières et voyages sur mesure.`,
            160
          ),

        h1:
          `Votre agence de voyages à ${agency.city}`,

        schemaType:
          "TravelAgency",
      };

    case "AGENCY":
      return {
        title:
          truncate(
            `Notre agence de voyages à ${agency.city} | ${agency.name}`,
            65
          ),

        description:
          truncate(
            `Découvrez ${agency.name}, votre agence de voyages à ${agency.city}, son accompagnement et ses coordonnées.`,
            160
          ),

        h1:
          `Notre agence de voyages à ${agency.city}`,

        schemaType:
          "AboutPage",
      };

    case "SERVICES":
      return {
        title:
          truncate(
            `Services de voyage à ${agency.city} | ${agency.name}`,
            65
          ),

        description:
          truncate(
            `Découvrez les services réellement proposés par ${agency.name}, votre agence de voyages à ${agency.city}, et bénéficiez de conseils adaptés à votre projet.`,
            160
          ),

        h1:
          `Nos services de voyage à ${agency.city}`,

        schemaType:
          "Service",
      };

    case "PARTNERS":
    case "PARTENAIRES":
      return {
        title:
          truncate(
            `Tour-opérateurs et partenaires | ${agency.name}`,
            65
          ),

        description:
          truncate(
            `Découvrez les tour-opérateurs, croisiéristes et spécialistes sélectionnés par ${agency.name} pour vos séjours, circuits, croisières et voyages sur mesure.`,
            160
          ),

        h1:
          `Nos partenaires voyage à ${agency.city}`,

        schemaType:
          "CollectionPage",
      };

    case "CONTACT":
      return {
        title:
          truncate(
            `Contact | ${agency.name} à ${agency.city}`,
            65
          ),

        description:
          truncate(
            `Contactez ${agency.name} à ${agency.city} pour préparer votre prochain voyage et échanger avec un conseiller.`,
            160
          ),

        h1:
          `Contactez notre agence à ${agency.city}`,

        schemaType:
          "ContactPage",
      };

    default:
      return {
        title:
          truncate(
            `${agency.name} | ${agency.city}`,
            65
          ),

        description:
          truncate(
            `${agency.name}, votre agence de voyages à ${agency.city}.`,
            160
          ),

        h1:
          agency.name,

        schemaType:
          "WebPage",
      };
  }
}

module.exports = {
  truncate,
  buildGeneralSeo,
};
