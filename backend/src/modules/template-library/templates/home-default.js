"use strict";

module.exports = {
  id:
    "mondescale.home.default",

  name:
    "Accueil Mondescale — Standard",

  description:
    "Template d'accueil par défaut pour une agence Mondescale.",

  kind:
    "page",

  pageType:
    "HOME",

  variant:
    "default",

  version:
    "1.0.0",

  status:
    "active",

  scope:
    "platform",

  tags: [
    "mondescale",
    "travel-agency",
    "default",
  ],

  sections: [
    {
      sectionType:
        "hero",

      displayOrder:
        10,

      content: {
        eyebrow:
          "Agence de voyages à {{agency.city}}",

        title:
          "Votre agence de voyages à {{agency.city}}",

        subtitle:
          "{{agency.name}} vous accompagne pour imaginer, organiser et réserver un voyage adapté à vos envies.",

        primaryCta: {
          label:
            "Préparer mon voyage",

          href:
            "{{computed.contactPath}}",

          kind:
            "primary",
        },

        secondaryCta: {
          label:
            "Découvrir l'agence",

          href:
            "{{computed.agencyPath}}",

          kind:
            "secondary",
        },
      },
    },

    {
      sectionType:
        "agency-introduction",

      displayOrder:
        20,

      content: {
        title:
          "Une agence proche de vous à {{agency.city}}",

        body:
          "Notre équipe vous accompagne dans la préparation de vos vacances, séjours, circuits, croisières et voyages sur mesure.",

        link: {
          label:
            "Découvrir notre agence",

          href:
            "{{computed.agencyPath}}",
        },
      },
    },

    {
      sectionType:
        "services-highlight",

      displayOrder:
        30,

      content: {
        title:
          "Tous vos projets de voyage",

        introduction:
          "{{agency.name}} vous accompagne dans chaque étape de votre voyage.",

        link: {
          label:
            "Voir tous nos services",

          href:
            "{{computed.servicesPath}}",
        },
      },
    },

    {
      sectionType:
        "destinations-highlight",

      displayOrder:
        40,

      content: {
        title:
          "Où souhaitez-vous partir ?",

        introduction:
          "Plage, circuit, grand voyage, escapade ou destination lointaine : partagez-nous vos envies.",

        cta: {
          label:
            "Demander un devis",

          href:
            "{{computed.contactPath}}",

          kind:
            "primary",
        },
      },
    },

    {
      sectionType:
        "trust",

      displayOrder:
        50,

      content: {
        title:
          "Pourquoi préparer votre voyage avec nous ?",
      },
    },

    {
      sectionType:
        "contact-cta",

      displayOrder:
        60,

      content: {
        title:
          "Un projet de voyage ?",

        body:
          "Parlez-en avec l'équipe de {{agency.name}}.",

        phone:
          "{{agency.phone}}",

        email:
          "{{agency.email}}",

        primaryCta: {
          label:
            "Demander un devis",

          href:
            "{{computed.contactPath}}",

          kind:
            "primary",
        },
      },
    },
  ],

  seo: {
    title:
      "Agence de voyages à {{agency.city}} | {{agency.name}}",

    description:
      "Préparez votre prochain voyage avec {{agency.name}}, votre agence de voyages à {{agency.city}}.",

    h1:
      "Votre agence de voyages à {{agency.city}}",

    schemaType:
      "TravelAgency",
  },
};
