"use strict";

const {
  COMPATIBILITY_BLOCK_DEFINITIONS,
} = require("./compatibility-block-definitions");

const BLOCK_DEFINITIONS = Object.freeze([
  {
    type: "hero",
    label: "Bannière principale",
    category: "structure",
    description: "Titre principal, introduction, visuel et appel à l’action.",
    singleton: true,
    defaults: {
      eyebrow: "",
      title: "Découvrez votre prochaine destination",
      subtitle: "",
      imageAssetId: "",
      imageUrl: "",
      imageAlt: "",
      primaryCta: {
        label: "Demander un devis",
        href: "#contact",
      },
      secondaryCta: null,
      alignment: "left",
    },
    fields: {
      eyebrow: { type: "string", maxLength: 80 },
      title: { type: "string", required: true, maxLength: 120 },
      subtitle: { type: "string", maxLength: 500 },
      imageAssetId: { type: "string", maxLength: 200 },
      imageUrl: { type: "url", nullable: true },
      imageAlt: { type: "string", maxLength: 180 },
      primaryCta: { type: "cta", nullable: true },
      secondaryCta: { type: "cta", nullable: true },
      alignment: {
        type: "enum",
        values: ["left", "center"],
        default: "left",
      },
    },
  },

  {
    type: "rich_text",
    label: "Texte enrichi",
    category: "content",
    description: "Bloc éditorial pour présenter une destination ou un service.",
    singleton: false,
    defaults: {
      title: "",
      html: "<p>Ajoutez votre contenu.</p>",
      alignment: "left",
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      html: { type: "html", required: true, maxLength: 30000 },
      alignment: {
        type: "enum",
        values: ["left", "center"],
        default: "left",
      },
    },
  },

  {
    type: "image_text",
    label: "Image et texte",
    category: "content",
    description: "Présentation en deux colonnes avec visuel.",
    singleton: false,
    defaults: {
      title: "",
      text: "",
      imageAssetId: "",
      imageUrl: "",
      imageAlt: "",
      imagePosition: "left",
      cta: null,
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      text: { type: "string", required: true, maxLength: 5000 },
      imageAssetId: { type: "string", maxLength: 200 },
      imageUrl: { type: "url", nullable: true },
      imageAlt: { type: "string", maxLength: 180 },
      imagePosition: {
        type: "enum",
        values: ["left", "right"],
        default: "left",
      },
      cta: { type: "cta", nullable: true },
    },
  },

  {
    type: "features",
    label: "Points forts",
    category: "content",
    description: "Liste visuelle des avantages ou points clés.",
    singleton: false,
    defaults: {
      title: "Les points forts",
      introduction: "",
      items: [],
      columns: 3,
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      introduction: { type: "string", maxLength: 1000 },
      items: {
        type: "array",
        required: true,
        minItems: 1,
        maxItems: 12,
        item: {
          type: "object",
          fields: {
            icon: { type: "string", maxLength: 40 },
            title: { type: "string", required: true, maxLength: 100 },
            text: { type: "string", maxLength: 500 },
          },
        },
      },
      columns: {
        type: "number",
        integer: true,
        min: 2,
        max: 4,
        default: 3,
      },
    },
  },

  {
    type: "gallery",
    label: "Galerie",
    category: "media",
    description: "Galerie de photographies.",
    singleton: false,
    defaults: {
      title: "",
      images: [],
      columns: 3,
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      images: {
        type: "array",
        required: true,
        minItems: 1,
        maxItems: 24,
        item: {
          type: "object",
          fields: {
            url: { type: "url", required: true },
            alt: { type: "string", required: true, maxLength: 180 },
            caption: { type: "string", maxLength: 300 },
          },
        },
      },
      columns: {
        type: "number",
        integer: true,
        min: 2,
        max: 4,
        default: 3,
      },
    },
  },

  {
    type: "faq",
    label: "Questions fréquentes",
    category: "seo",
    description: "FAQ éditoriale compatible avec les données structurées.",
    singleton: false,
    defaults: {
      title: "Questions fréquentes",
      items: [],
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      items: {
        type: "array",
        required: true,
        minItems: 1,
        maxItems: 30,
        item: {
          type: "object",
          fields: {
            question: {
              type: "string",
              required: true,
              maxLength: 220,
            },
            answer: {
              type: "string",
              required: true,
              maxLength: 3000,
            },
          },
        },
      },
    },
  },

  {
    type: "cta",
    label: "Appel à l’action",
    category: "conversion",
    description: "Bloc de conversion vers l’agence.",
    singleton: false,
    defaults: {
      title: "Votre voyage commence ici",
      text: "Parlez de votre projet avec votre conseiller.",
      primaryCta: {
        label: "Demander un devis",
        href: "#contact",
      },
      secondaryCta: null,
      style: "primary",
    },
    fields: {
      title: { type: "string", required: true, maxLength: 140 },
      text: { type: "string", maxLength: 1000 },
      primaryCta: { type: "cta", required: true },
      secondaryCta: { type: "cta", nullable: true },
      style: {
        type: "enum",
        values: ["primary", "soft", "dark"],
        default: "primary",
      },
    },
  },

  {
    type: "agency",
    label: "Votre agence",
    category: "conversion",
    description: "Coordonnées, horaires et actions de contact.",
    singleton: true,
    defaults: {
      title: "Votre agence de voyages",
      showAddress: true,
      showPhone: true,
      showEmail: true,
      showHours: true,
      showMap: false,
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      showAddress: { type: "boolean", default: true },
      showPhone: { type: "boolean", default: true },
      showEmail: { type: "boolean", default: true },
      showHours: { type: "boolean", default: true },
      showMap: { type: "boolean", default: false },
    },
  },

  {
    type: "offers",
    label: "Offres",
    category: "travel",
    description: "Sélection d’offres de voyage.",
    singleton: false,
    defaults: {
      title: "Nos offres",
      introduction: "",
      source: "manual",
      offerIds: [],
      limit: 6,
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      introduction: { type: "string", maxLength: 1000 },
      source: {
        type: "enum",
        values: ["manual", "destination", "latest"],
        default: "manual",
      },
      offerIds: {
        type: "array",
        maxItems: 24,
        item: { type: "string", maxLength: 100 },
      },
      limit: {
        type: "number",
        integer: true,
        min: 1,
        max: 24,
        default: 6,
      },
    },
  },

  {
    type: "destinations",
    label: "Destinations associées",
    category: "travel",
    description: "Maillage vers des destinations complémentaires.",
    singleton: false,
    defaults: {
      title: "À découvrir également",
      destinationIds: [],
      limit: 6,
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      destinationIds: {
        type: "array",
        maxItems: 24,
        item: { type: "string", maxLength: 100 },
      },
      limit: {
        type: "number",
        integer: true,
        min: 1,
        max: 24,
        default: 6,
      },
    },
  },

  {
    type: "testimonials",
    label: "Avis clients",
    category: "trust",
    description: "Avis et témoignages clients.",
    singleton: false,
    defaults: {
      title: "Ils nous font confiance",
      source: "google",
      items: [],
      limit: 6,
    },
    fields: {
      title: { type: "string", maxLength: 140 },
      source: {
        type: "enum",
        values: ["google", "manual"],
        default: "google",
      },
      items: {
        type: "array",
        maxItems: 20,
        item: {
          type: "object",
          fields: {
            author: { type: "string", required: true, maxLength: 120 },
            text: { type: "string", required: true, maxLength: 1500 },
            rating: {
              type: "number",
              integer: true,
              min: 1,
              max: 5,
            },
          },
        },
      },
      limit: {
        type: "number",
        integer: true,
        min: 1,
        max: 20,
        default: 6,
      },
    },
  },

  {
    type: "separator",
    label: "Séparateur",
    category: "structure",
    description: "Espacement ou séparation visuelle.",
    singleton: false,
    defaults: {
      size: "medium",
      line: false,
    },
    fields: {
      size: {
        type: "enum",
        values: ["small", "medium", "large"],
        default: "medium",
      },
      line: { type: "boolean", default: false },
    },
  },

  {
      type: "breadcrumbs",
      label: "Fil d’Ariane",
      category: "navigation",
      description: "Navigation hiérarchique entre l’accueil et la page courante.",
      singleton: true,
      defaults: {
        items: []
      },
      fields: {
        items: {
          type: "array",
          required: true,
          minItems: 1,
          maxItems: 20,
          item: {
            type: "object",
            fields: {
              href: {
                type: "string",
                maxLength: 1000,
                required: true
              },
              label: {
                type: "string",
                maxLength: 240,
                required: true
              }
            }
          }
        }
      }
    },

  ...COMPATIBILITY_BLOCK_DEFINITIONS,
]);

module.exports = {
  BLOCK_DEFINITIONS,
};
