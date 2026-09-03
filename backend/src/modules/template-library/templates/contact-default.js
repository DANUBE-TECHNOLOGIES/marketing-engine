"use strict";

module.exports = {
  id:
    "mondescale.contact.default",

  name:
    "Contact agence — Standard",

  kind:
    "page",

  pageType:
    "CONTACT",

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
    "contact",
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

        website:
          "{{agency.website}}",
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
          "{{agency.fullAddress}}",
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
      "Contact | {{agency.name}} à {{agency.city}}",

    description:
      "Contactez {{agency.name}} à {{agency.city}} pour préparer votre prochain voyage et échanger avec un conseiller.",

    h1:
      "Contactez notre agence à {{agency.city}}",

    schemaType:
      "ContactPage",
  },
};
