"use strict";

export const BLOCK_CATALOG = Object.freeze([
  {
    type: "hero",
    label: "Bannière principale",
    category: "Structure",
    icon: "◫",
    singleton: true,
    defaults: {
      eyebrow: "",
      title: "Découvrez votre prochaine destination",
      subtitle: "",
      imageUrl: "",
      imageAlt: "",
      primaryCta: {
        label: "Demander un devis",
        href: "#contact",
      },
      alignment: "left",
    },
  },
  {
    type: "page-header",
    label: "En-tête de page",
    category: "Structure",
    icon: "▤",
    singleton: true,
    defaults: {
      title: "Titre de la page",
      introduction: "",
    },
  },
  {
    type: "rich_text",
    label: "Texte enrichi",
    category: "Contenu",
    icon: "¶",
    defaults: {
      title: "Présentation",
      html: "<p>Ajoutez votre contenu éditorial.</p>",
      alignment: "left",
    },
  },
  {
    type: "partners-introduction",
    label: "Introduction partenaires",
    category: "Contenu",
    icon: "¶",
    singleton: true,
    defaults: {
      title: "Des partenaires sélectionnés par votre agence",
      text: "Présentez ici la manière dont votre agence sélectionne et compare ses partenaires voyage.",
    },
  },
  {
    type: "image_text",
    label: "Image et texte",
    category: "Contenu",
    icon: "▧",
    defaults: {
      title: "Une expérience inoubliable",
      text: "Présentez ici les atouts de cette destination.",
      imageUrl: "",
      imageAlt: "",
      imagePosition: "left",
      primaryCta: {
        label: "",
        href: "#contact",
      },
    },
  },
  {
    type: "features",
    label: "Points forts",
    category: "Contenu",
    icon: "✦",
    defaults: {
      title: "Les points forts",
      introduction: "",
      columns: 3,
      items: [
        {
          icon: "✦",
          title: "Conseil personnalisé",
          text: "Votre conseiller construit un voyage adapté à vos envies.",
        },
      ],
    },
  },
  {
    type: "team",
    label: "Équipe",
    category: "Confiance",
    icon: "♙",
    defaults: {
      title: "Une équipe passionnée",
      text: "Rencontrez les conseillers qui imaginent et accompagnent vos voyages.",
      source: "agency-team",
      members: [],
      columns: 3,
    },
  },
  {
    type: "partner-logos",
    label: "Partenaires",
    category: "Confiance",
    icon: "◇",
    defaults: {
      title: "Nos partenaires voyage",
      text: "",
      items: [],
      agencyPartners: [],
      maxAgencyPartners: 3,
    },
  },
  {
    type: "partner-directory",
    label: "Annuaire complet des partenaires",
    category: "Confiance",
    icon: "▦",
    singleton: true,
    defaults: {
      title: "Tous nos partenaires voyage",
      text: "Nos conseillers s'appuient sur un large réseau de tour-opérateurs, croisiéristes et spécialistes pour comparer les solutions et construire le voyage le plus adapté à votre projet.",
    },
  },
  {
    type: "gallery",
    label: "Galerie",
    category: "Médias",
    icon: "▦",
    defaults: {
      title: "Découvrez la destination en images",
      columns: 3,
      images: [],
    },
  },
  {
    type: "faq",
    label: "Questions fréquentes",
    category: "SEO",
    icon: "?",
    defaults: {
      title: "Questions fréquentes",
      items: [
        {
          question: "Quand partir ?",
          answer: "Votre conseiller vous indiquera la période la plus adaptée.",
        },
      ],
    },
  },
  {
    type: "cta",
    label: "Appel à l’action",
    category: "Conversion",
    icon: "→",
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
  },
  {
    type: "contact-cta",
    label: "CTA contact agence",
    category: "Conversion",
    icon: "→",
    singleton: true,
    defaults: {
      title: "Parlons de votre prochain voyage",
      text: "Contactez votre agence pour obtenir un conseil personnalisé.",
      actions: [],
    },
  },
  {
    type: "agency",
    label: "Votre agence",
    category: "Conversion",
    icon: "⌂",
    singleton: true,
    defaults: {
      title: "Votre agence de voyages",
      showAddress: true,
      showPhone: true,
      showEmail: true,
      showHours: true,
      showMap: false,
    },
  },
  {
    type: "offers",
    label: "Offres",
    category: "Voyage",
    icon: "€",
    defaults: {
      title: "Nos offres",
      introduction: "",
      source: "campaign",
      offerIds: [],
      limit: 6,
    },
  },
  {
    type: "destinations",
    label: "Destinations associées",
    category: "Voyage",
    icon: "◎",
    defaults: {
      title: "À découvrir également",
      source: "automatic",
      selectionMode: "automatic",
      destinationIds: [],
      limit: 6,
    },
  },
  {
    type: "inspirations",
    label: "Inspirations",
    category: "Voyage",
    icon: "✺",
    defaults: {
      title: "Laissez-vous inspirer",
      text: "Conseils, idées et récits pour préparer votre prochain voyage.",
      source: "content-generation",
      contentIds: [],
      limit: 6,
    },
  },
  {
    type: "testimonials",
    label: "Avis clients",
    category: "Confiance",
    icon: "★",
    defaults: {
      title: "Ils nous font confiance",
      source: "google",
      items: [],
      limit: 6,
    },
  },
  {
    type: "separator",
    label: "Séparateur",
    category: "Structure",
    icon: "—",
    defaults: {
      size: "medium",
      line: false,
    },
  },
]);

export function getBlockDefinition(type) {
  return BLOCK_CATALOG.find((item) => item.type === type) || null;
}

export function groupBlockCatalog() {
  return BLOCK_CATALOG.reduce((groups, block) => {
    if (!groups[block.category]) groups[block.category] = [];
    groups[block.category].push(block);
    return groups;
  }, {});
}
