"use strict";

module.exports = {
  id:
    "mondescale.services.default",

  name:
    "Services voyage — Standard",

  kind:
    "page",

  pageType:
    "SERVICES",

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
    "services",
  ],

  sections: [
    {
      sectionType:
        "page-header",

      displayOrder:
        10,

      content: {
        eyebrow:
          "{{agency.city}}",

        title:
          "Nos services voyage",

        introduction:
          "{{agency.name}} vous accompagne pour organiser votre voyage de la première idée jusqu'au départ.",
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
          "Dates, rythme, budget, hébergements et transports : votre conseiller étudie avec vous les différentes possibilités.",

        cta: {
          label:
            "Demander un devis",

          href:
            "{{computed.contactPath}}",
        },
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
          "Votre agence centralise votre projet et reste disponible pour répondre à vos questions.",
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
          "Échangez avec {{agency.name}} et obtenez une proposition adaptée à votre projet.",

        primaryCta: {
          label:
            "Demander un devis",

          href:
            "{{computed.contactPath}}",
        },
      },
    },
  ],

  seo: {
    title:
      "Services de votre agence de voyages à {{agency.city}}",

    description:
      "Séjours, circuits, croisières et voyages sur mesure : découvrez les services proposés par {{agency.name}}.",

    h1:
      "Nos services voyage",

    schemaType:
      "Service",
  },
};
