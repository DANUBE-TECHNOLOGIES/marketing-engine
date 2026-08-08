const COMMON_FIELDS = [
  {
    key: "title",
    label: "Titre",
    control: "text",
  },
  {
    key: "text",
    label: "Texte d’introduction",
    control: "textarea",
    rows: 5,
  },
];

export const INSPECTOR_REGISTRY = {
  hero: {
    fields: [
      {
        key: "title",
        label: "Titre principal",
        control: "text",
      },
      {
        key: "subtitle",
        label: "Sous-titre",
        control: "textarea",
        rows: 5,
      },
      {
        key: "backgroundImage",
        label: "URL de l’image",
        control: "url",
      },
      {
        key: "imageAlt",
        label: "Texte alternatif",
        control: "text",
      },
      {
        key: "backgroundPosition",
        label: "Position de l’image",
        control: "select",
        options: [
          ["center", "Centrée"],
          ["top", "Haut"],
          ["bottom", "Bas"],
          ["left", "Gauche"],
          ["right", "Droite"],
        ],
      },
      {
        key: "overlayOpacity",
        label: "Intensité de l’overlay",
        control: "range",
        min: 20,
        max: 90,
        step: 5,
      },
      {
        key: "primaryButton",
        label: "Bouton principal",
        control: "text",
      },
      {
        key: "secondaryButton",
        label: "Bouton secondaire",
        control: "text",
      },
    ],
  },

  "rich-text": {
    fields: COMMON_FIELDS,
  },

  services: {
    fields: COMMON_FIELDS,
    collection: {
      key: "items",
      label: "Services",
      itemLabel: "Service",
      fields: [
        {
          key: "title",
          label: "Nom",
          control: "text",
        },
        {
          key: "description",
          label: "Description",
          control: "textarea",
          rows: 3,
        },
      ],
    },
  },

  destinations: {
    fields: COMMON_FIELDS,
    collection: {
      key: "items",
      label: "Destinations",
      itemLabel: "Destination",
      fields: [
        {
          key: "title",
          label: "Nom",
          control: "text",
        },
        {
          key: "eyebrow",
          label: "Région ou thème",
          control: "text",
        },
        {
          key: "description",
          label: "Description",
          control: "textarea",
          rows: 3,
        },
        {
          key: "image",
          label: "URL de l’image",
          control: "url",
        },
      ],
    },
  },

  offers: {
    fields: COMMON_FIELDS,
    collection: {
      key: "items",
      label: "Offres",
      itemLabel: "Offre",
      fields: [
        {
          key: "title",
          label: "Titre",
          control: "text",
        },
        {
          key: "badge",
          label: "Badge",
          control: "text",
        },
        {
          key: "description",
          label: "Description",
          control: "textarea",
          rows: 3,
        },
        {
          key: "price",
          label: "Prix affiché",
          control: "text",
        },
        {
          key: "image",
          label: "URL de l’image",
          control: "url",
        },
      ],
    },
  },

  inspirations: {
    fields: COMMON_FIELDS,
    collection: {
      key: "items",
      label: "Inspirations",
      itemLabel: "Article",
      fields: [
        {
          key: "title",
          label: "Titre",
          control: "text",
        },
        {
          key: "category",
          label: "Catégorie",
          control: "text",
        },
        {
          key: "description",
          label: "Résumé",
          control: "textarea",
          rows: 3,
        },
        {
          key: "image",
          label: "URL de l’image",
          control: "url",
        },
      ],
    },
  },

  stats: {
    fields: [
      {
        key: "title",
        label: "Titre",
        control: "text",
      },
    ],
    collection: {
      key: "items",
      label: "Chiffres clés",
      itemLabel: "Chiffre",
      fields: [
        {
          key: "value",
          label: "Valeur",
          control: "text",
        },
        {
          key: "label",
          label: "Libellé",
          control: "text",
        },
      ],
    },
  },

  partners: {
    fields: [
      {
        key: "title",
        label: "Titre",
        control: "text",
      },
    ],
    collection: {
      key: "items",
      label: "Partenaires",
      itemLabel: "Partenaire",
      fields: [
        {
          key: "name",
          label: "Nom",
          control: "text",
        },
        {
          key: "logo",
          label: "URL du logo",
          control: "url",
        },
      ],
    },
  },

  faq: {
    fields: [
      {
        key: "title",
        label: "Titre",
        control: "text",
      },
    ],
    collection: {
      key: "items",
      label: "Questions",
      itemLabel: "Question",
      fields: [
        {
          key: "question",
          label: "Question",
          control: "text",
        },
        {
          key: "answer",
          label: "Réponse",
          control: "textarea",
          rows: 4,
        },
      ],
    },
  },

  appointment: {
    fields: [
      {
        key: "title",
        label: "Titre",
        control: "text",
      },
      {
        key: "text",
        label: "Texte",
        control: "textarea",
        rows: 5,
      },
      {
        key: "primaryButton",
        label: "Libellé du bouton",
        control: "text",
      },
    ],
  },

  cta: {
    fields: [
      {
        key: "title",
        label: "Titre",
        control: "text",
      },
      {
        key: "text",
        label: "Texte",
        control: "textarea",
        rows: 5,
      },
      {
        key: "primaryButton",
        label: "Libellé du bouton",
        control: "text",
      },
    ],
  },

  contact: {
    fields: COMMON_FIELDS,
  },


  hours: {
    fields: [
      {
        key: "title",
        label: "Titre",
        control: "text",
      },
    ],
  },

  map: {
    fields: [
      {
        key: "title",
        label: "Titre",
        control: "text",
      },
    ],
  },

  reviews: {
    fields: COMMON_FIELDS,
  },

  team: {
    fields: COMMON_FIELDS,
  },
};

export function getInspectorDefinition(type) {
  return (
    INSPECTOR_REGISTRY[type] || {
      fields: COMMON_FIELDS,
    }
  );
}
