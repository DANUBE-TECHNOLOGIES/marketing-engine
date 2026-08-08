"use strict";

const CONTENT_ENGINE_VERSION =
  "1.0";

const CONTENT_SOURCES =
  Object.freeze({
    DEFAULT:
      "default-builder",

    HUMAN:
      "human",

    AI:
      "ai",

    IMPORTED:
      "imported",
  });

const GENERAL_PAGE_TYPES =
  Object.freeze([
    "HOME",
    "AGENCY",
    "SERVICES",
    "CONTACT",
    "LEGAL",
    "PRIVACY",
  ]);

const DEFAULT_SERVICES =
  Object.freeze([
    {
      key:
        "custom-travel",

      title:
        "Voyages sur mesure",

      description:
        "Un voyage construit avec vous selon vos envies, votre rythme et votre budget.",
    },
    {
      key:
        "stays",

      title:
        "Séjours et clubs",

      description:
        "Une sélection de séjours, hôtels et clubs adaptée à votre façon de voyager.",
    },
    {
      key:
        "tours",

      title:
        "Circuits et autotours",

      description:
        "Des itinéraires accompagnés ou en liberté pour découvrir une destination autrement.",
    },
    {
      key:
        "cruises",

      title:
        "Croisières",

      description:
        "Croisières maritimes et fluviales sélectionnées avec l'accompagnement de votre conseiller.",
    },
    {
      key:
        "honeymoon",

      title:
        "Voyages de noces",

      description:
        "Des projets personnalisés pour transformer votre voyage de noces en expérience unique.",
    },
    {
      key:
        "ticketing",

      title:
        "Billetterie et transport",

      description:
        "Recherche et réservation des solutions de transport adaptées à votre projet.",
    },
  ]);

const DEFAULT_TRUST_ITEMS =
  Object.freeze([
    {
      key:
        "human-advice",

      title:
        "Un conseil humain",

      description:
        "Un conseiller identifié vous accompagne dans la préparation de votre voyage.",
    },
    {
      key:
        "personalized",

      title:
        "Un projet personnalisé",

      description:
        "Vos envies, vos contraintes et votre budget sont pris en compte dans chaque proposition.",
    },
    {
      key:
        "support",

      title:
        "Un accompagnement durable",

      description:
        "Votre agence reste votre interlocuteur avant, pendant et après votre voyage.",
    },
    {
      key:
        "local-agency",

      title:
        "Une agence de proximité",

      description:
        "Vous pouvez échanger avec une équipe locale et retrouver un interlocuteur physique.",
    },
  ]);

module.exports = {
  CONTENT_ENGINE_VERSION,
  CONTENT_SOURCES,
  GENERAL_PAGE_TYPES,
  DEFAULT_SERVICES,
  DEFAULT_TRUST_ITEMS,
};
