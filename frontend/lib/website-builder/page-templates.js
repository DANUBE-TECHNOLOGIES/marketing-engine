import {
  createSectionBlock,
  getSectionDefinition,
} from "./section-library";

export const PAGE_TEMPLATES = [
  {
    id: "mondescale-premium",
    name: "Premium Mondescale",
    category: "premium",
    icon: "✦",
    featured: true,
    description:
      "Une page d’accueil élégante et complète, orientée confiance et conversion.",
    palette: {
      primary: "#0b5fff",
      secondary: "#102a43",
      accent: "#ff9f1c",
    },
    sections: [
      "hero-premium",
      "agency-story",
      "travel-destinations",
      "agency-services",
      "agency-team",
      "trust-google-reviews",
      "travel-offers",
      "trust-stats",
      "seo-faq",
      "conversion-appointment",
      "agency-hours",
      "seo-map",
    ],
  },
  {
    id: "fram-sun",
    name: "FRAM Soleil",
    category: "tour-operator",
    icon: "☀",
    description:
      "Un modèle chaleureux pour mettre en avant clubs, offres et destinations ensoleillées.",
    palette: {
      primary: "#e30613",
      secondary: "#17324d",
      accent: "#ffc400",
    },
    sections: [
      "hero-fullscreen",
      "travel-offers",
      "travel-destinations",
      "agency-services",
      "agency-commitments",
      "trust-google-reviews",
      "trust-partners",
      "seo-faq",
      "conversion-cta",
      "agency-hours",
      "conversion-contact",
    ],
  },
  {
    id: "luxury-signature",
    name: "Luxe Signature",
    category: "luxury",
    icon: "◆",
    description:
      "Une composition épurée et haut de gamme pour le sur-mesure et les voyages d’exception.",
    palette: {
      primary: "#b28b46",
      secondary: "#161616",
      accent: "#e4cf9f",
    },
    sections: [
      "hero-fullscreen",
      "agency-story",
      "travel-inspirations",
      "travel-destinations",
      "agency-team",
      "trust-stats",
      "trust-google-reviews",
      "conversion-appointment",
      "conversion-contact",
    ],
  },
];

export function getPageTemplate(templateId) {
  return (
    PAGE_TEMPLATES.find(
      (template) => template.id === templateId
    ) || null
  );
}

function replaceTokens(value, context) {
  if (typeof value === "string") {
    return value
      .replaceAll(
        "{{agencyName}}",
        context.agencyName || "Votre agence"
      )
      .replaceAll(
        "{{city}}",
        context.city || "votre ville"
      );
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      replaceTokens(item, context)
    );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value).map(
        ([key, item]) => [
          key,
          replaceTokens(item, context),
        ]
      )
    );
  }

  return value;
}

export function instantiatePageTemplate(
  template,
  context = {}
) {
  if (!template) {
    return [];
  }

  return template.sections
    .map((templateId) => {
      const definition =
        getSectionDefinition(templateId);

      if (!definition) {
        return null;
      }

      const block =
        createSectionBlock(definition);

      return {
        ...block,
        settings: {
          ...replaceTokens(
            block.settings,
            context
          ),
          __pageTemplateId: template.id,
        },
      };
    })
    .filter(Boolean);
}
