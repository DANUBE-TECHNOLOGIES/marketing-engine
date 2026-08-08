"use strict";

module.exports = {
  id:
    "mondescale.agency.default",

  name:
    "Présentation agence — Standard",

  description:
    "Template de présentation générale d'une agence.",

  kind:
    "page",

  pageType:
    "AGENCY",

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
    "agency",
  ],

  sections: [
    {
      sectionType:
        "page-header",

      displayOrder:
        10,

      content: {
        eyebrow:
          "Agence de voyages à {{agency.city}}",

        title:
          "Notre agence",

        introduction:
          "Bienvenue chez {{agency.name}}, votre interlocuteur local pour préparer vos voyages.",
      },
    },

    {
      sectionType:
        "agency-story",

      displayOrder:
        20,

      content: {
        title:
          "Votre projet commence à {{agency.city}}",

        body:
          "{{agency.name}} accompagne les voyageurs dans la préparation de séjours en France et à l'étranger.",
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
          "{{agency.name}}",

        address:
          "{{agency.fullAddress}}",

        phone:
          "{{agency.phone}}",

        phoneHref:
          "{{agency.phoneHref}}",

        email:
          "{{agency.email}}",

        emailHref:
          "{{agency.emailHref}}",
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

        primaryCta: {
          label:
            "Préparer mon voyage",

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
      "Notre agence de voyages à {{agency.city}} | {{agency.name}}",

    description:
      "Découvrez {{agency.name}}, votre agence de voyages à {{agency.city}}, son accompagnement et ses coordonnées.",

    h1:
      "Notre agence de voyages à {{agency.city}}",

    schemaType:
      "AboutPage",
  },
};
