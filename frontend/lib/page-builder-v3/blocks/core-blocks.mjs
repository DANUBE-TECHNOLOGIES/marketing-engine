export const CORE_BLOCK_MANIFESTS = [
  {
    version: "1.0.0",
    type: "hero",
    label: "Bannière principale",
    description:
      "Introduction visuelle principale de la page.",
    category: "structure",
    icon: "◫",
    singleton: true,
    capabilities: {
      duplicable: false,
      ai: true,
    },
    defaults: {
      eyebrow: "",
      title:
        "Découvrez votre prochaine destination",
      subtitle: "",
      imageUrl: "",
      imageAlt: "",
      primaryCta: {
        label: "Demander un devis",
        href: "#contact",
      },
      alignment: "left",
    },
    schema: {
      title: {
        type: "string",
        required: true,
        maxLength: 120,
      },
      subtitle: {
        type: "string",
        maxLength: 500,
      },
      imageUrl: {
        type: "url",
      },
    },
  },

  {
    version: "1.0.0",
    type: "rich_text",
    label: "Texte enrichi",
    description:
      "Contenu éditorial libre.",
    category: "content",
    icon: "¶",
    capabilities: {
      ai: true,
    },
    defaults: {
      title: "Présentation",
      html:
        "<p>Ajoutez votre contenu éditorial.</p>",
      alignment: "left",
    },
    schema: {
      title: {
        type: "string",
        maxLength: 140,
      },
      html: {
        type: "html",
        required: true,
      },
    },
  },

  {
    version: "1.0.0",
    type: "image_text",
    label: "Image et texte",
    description:
      "Composition éditoriale en deux colonnes.",
    category: "content",
    icon: "▧",
    capabilities: {
      ai: true,
    },
    defaults: {
      title:
        "Une expérience inoubliable",
      text:
        "Présentez ici les atouts de cette destination.",
      imageUrl: "",
      imageAlt: "",
      imagePosition: "left",
    },
    schema: {
      title: {
        type: "string",
        maxLength: 140,
      },
      text: {
        type: "string",
        required: true,
      },
    },
  },

  {
    version: "1.0.0",
    type: "features",
    label: "Points forts",
    description:
      "Liste des avantages ou éléments clés.",
    category: "content",
    icon: "✦",
    capabilities: {
      ai: true,
    },
    defaults: {
      title: "Les points forts",
      introduction: "",
      columns: 3,
      items: [
        {
          icon: "✦",
          title:
            "Conseil personnalisé",
          text:
            "Un accompagnement adapté à votre projet.",
        },
      ],
    },
    schema: {
      items: {
        type: "array",
        minItems: 1,
        maxItems: 12,
      },
    },
  },

  {
    version: "1.0.0",
    type: "gallery",
    label: "Galerie",
    description:
      "Collection d’images optimisées.",
    category: "media",
    icon: "▦",
    defaults: {
      title:
        "Découvrez la destination en images",
      columns: 3,
      images: [],
    },
    schema: {
      images: {
        type: "array",
        maxItems: 24,
      },
    },
  },

  {
    version: "1.0.0",
    type: "faq",
    label: "Questions fréquentes",
    description:
      "Questions et réponses compatibles FAQ Schema.",
    category: "seo",
    icon: "?",
    capabilities: {
      ai: true,
    },
    defaults: {
      title: "Questions fréquentes",
      items: [
        {
          question: "Quand partir ?",
          answer:
            "Votre conseiller vous indiquera la période la plus adaptée.",
        },
      ],
    },
    schema: {
      items: {
        type: "array",
        minItems: 1,
        maxItems: 30,
      },
    },
  },

  {
    version: "1.0.0",
    type: "cta",
    label: "Appel à l’action",
    description:
      "Bloc destiné à convertir le visiteur.",
    category: "conversion",
    icon: "→",
    defaults: {
      title:
        "Votre voyage commence ici",
      text:
        "Parlez de votre projet avec votre conseiller.",
      primaryCta: {
        label: "Demander un devis",
        href: "#contact",
      },
      style: "primary",
    },
    schema: {
      title: {
        type: "string",
        required: true,
      },
    },
  },

  {
    version: "1.0.0",
    type: "agency",
    label: "Votre agence",
    description:
      "Coordonnées et moyens de contact.",
    category: "conversion",
    icon: "⌂",
    singleton: true,
    capabilities: {
      duplicable: false,
    },
    defaults: {
      title:
        "Votre agence de voyages",
      showAddress: true,
      showPhone: true,
      showEmail: true,
      showHours: true,
      showMap: false,
    },
    schema: {},
  },
];
