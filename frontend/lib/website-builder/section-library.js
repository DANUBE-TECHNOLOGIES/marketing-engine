export const SECTION_CATEGORIES = [
  {
    id: "hero",
    label: "En-têtes",
    description: "Première impression et conversion",
  },
  {
    id: "agency",
    label: "Présentation",
    description: "Agence, équipe et engagements",
  },
  {
    id: "travel",
    label: "Voyage",
    description: "Destinations, offres et inspirations",
  },
  {
    id: "trust",
    label: "Confiance",
    description: "Avis, chiffres et partenaires",
  },
  {
    id: "conversion",
    label: "Conversion",
    description: "Contact, devis et prise de rendez-vous",
  },
  {
    id: "seo",
    label: "SEO & informations",
    description: "FAQ, carte et contenus éditoriaux",
  },
];

export const SECTION_LIBRARY = [
  {
    id: "hero-premium",
    category: "hero",
    type: "hero",
    variant: "premium",
    label: "Hero Premium",
    description: "Image immersive, titre et deux CTA",
    icon: "✦",
    featured: true,
    defaults: {
      title: "Votre prochain voyage commence ici",
      subtitle:
        "Nos conseillers imaginent avec vous un séjour qui vous ressemble.",
      primaryButton: "Demander un devis",
      secondaryButton: "Prendre rendez-vous",
      backgroundPosition: "center",
      overlayOpacity: 65,
      minHeight: "large",
    },
  },
  {
    id: "hero-fullscreen",
    category: "hero",
    type: "hero",
    variant: "fullscreen",
    label: "Hero Plein écran",
    description: "Une photographie spectaculaire sur toute la hauteur",
    icon: "▣",
    defaults: {
      title: "Voyagez autrement",
      subtitle:
        "Une expertise humaine pour créer des souvenirs uniques.",
      primaryButton: "Construire mon voyage",
      secondaryButton: "Découvrir l’agence",
      backgroundPosition: "center",
      overlayOpacity: 58,
      minHeight: "fullscreen",
    },
  },
  {
    id: "hero-split",
    category: "hero",
    type: "hero",
    variant: "split",
    label: "Hero partagé",
    description: "Texte à gauche et visuel à droite",
    icon: "◧",
    defaults: {
      title: "Des voyages créés pour vous",
      subtitle:
        "Profitez des conseils d’une équipe passionnée et disponible.",
      primaryButton: "Parler à un conseiller",
      secondaryButton: "Nos inspirations",
      backgroundPosition: "right",
      overlayOpacity: 45,
      minHeight: "medium",
    },
  },

  {
    id: "agency-story",
    category: "agency",
    type: "rich-text",
    variant: "agency-story",
    label: "Présentation de l’agence",
    description: "Histoire, valeurs et savoir-faire",
    icon: "¶",
    defaults: {
      title: "Une agence proche de vous",
      text:
        "Notre équipe vous accompagne avant, pendant et après votre voyage.",
      alignment: "left",
    },
  },
  {
    id: "agency-services",
    category: "agency",
    type: "services",
    variant: "cards",
    label: "Services",
    description: "Les expertises proposées par l’agence",
    icon: "▦",
    defaults: {
      title: "Un accompagnement complet",
      text:
        "De la première idée jusqu’à votre retour, nous restons à vos côtés.",
      items: [
        {
          title: "Voyages sur mesure",
          description: "Un itinéraire construit selon vos envies.",
        },
        {
          title: "Circuits accompagnés",
          description: "Découvrez le monde en toute sérénité.",
        },
        {
          title: "Croisières",
          description: "Une sélection adaptée à chaque voyageur.",
        },
      ],
    },
  },
  {
    id: "agency-team",
    category: "agency",
    type: "team",
    variant: "profiles",
    label: "Équipe",
    description: "Conseillers, spécialités et destinations favorites",
    icon: "●",
    dataSource: "agency-team",
    defaults: {
      title: "Une équipe passionnée",
      text:
        "Rencontrez les conseillers qui donneront vie à votre projet.",
      members: [],
    },
  },
  {
    id: "agency-commitments",
    category: "agency",
    type: "services",
    variant: "commitments",
    label: "Nos engagements",
    description: "Proximité, expertise et assistance",
    icon: "✓",
    defaults: {
      title: "Pourquoi choisir notre agence ?",
      items: [
        {
          title: "Expertise",
          description: "Des conseils fondés sur une vraie connaissance du voyage.",
        },
        {
          title: "Disponibilité",
          description: "Un interlocuteur avant, pendant et après le séjour.",
        },
        {
          title: "Sérénité",
          description: "Nous anticipons les détails et les imprévus.",
        },
      ],
    },
  },

  {
    id: "travel-destinations",
    category: "travel",
    type: "destinations",
    variant: "immersive-grid",
    label: "Destinations à la une",
    description: "Une grille visuelle de destinations",
    icon: "⌖",
    dataSource: "travel-core",
    defaults: {
      title: "Nos inspirations du moment",
      text:
        "Découvrez des destinations sélectionnées par nos conseillers.",
      items: [],
    },
  },
  {
    id: "travel-offers",
    category: "travel",
    type: "offers",
    variant: "cards",
    label: "Offres du moment",
    description: "Promotions et séjours mis en avant",
    icon: "€",
    dataSource: "campaigns",
    defaults: {
      title: "Les offres à ne pas manquer",
      text:
        "Une sélection actualisée de voyages et de bons plans.",
      items: [],
    },
  },
  {
    id: "travel-inspirations",
    category: "travel",
    type: "inspirations",
    variant: "editorial",
    label: "Inspirations voyage",
    description: "Articles, conseils et idées de séjours",
    icon: "◇",
    dataSource: "content-generation",
    defaults: {
      title: "Laissez-vous inspirer",
      items: [],
    },
  },

  {
    id: "trust-google-reviews",
    category: "trust",
    type: "reviews",
    variant: "google",
    label: "Avis Google",
    description: "Note moyenne et derniers témoignages",
    icon: "★",
    featured: true,
    dataSource: "google-reviews",
    defaults: {
      title: "Ils nous ont confié leurs voyages",
      text:
        "Découvrez les expériences partagées par nos clients.",
      reviews: [],
    },
  },
  {
    id: "trust-stats",
    category: "trust",
    type: "stats",
    variant: "numbers",
    label: "Chiffres clés",
    description: "Expérience, voyageurs et satisfaction",
    icon: "%",
    defaults: {
      title: "Notre expertise en quelques chiffres",
      items: [
        { value: "100 %", label: "Conseils personnalisés" },
        { value: "24/7", label: "Assistance en voyage" },
        { value: "5★", label: "Satisfaction recherchée" },
      ],
    },
  },
  {
    id: "trust-partners",
    category: "trust",
    type: "partners",
    variant: "logos",
    label: "Partenaires",
    description: "Tour-opérateurs, réseaux et labels",
    icon: "∞",
    defaults: {
      title: "Des partenaires de confiance",
      items: [],
    },
  },

  {
    id: "conversion-cta",
    category: "conversion",
    type: "cta",
    variant: "premium",
    label: "Appel à l’action",
    description: "Un bloc fort pour générer des demandes",
    icon: "→",
    defaults: {
      title: "Prêt à imaginer votre prochain voyage ?",
      text:
        "Échangez avec votre conseiller et recevez une proposition personnalisée.",
      primaryButton: "Demander un devis",
    },
  },
  {
    id: "conversion-contact",
    category: "conversion",
    type: "contact",
    variant: "agency",
    label: "Contact et horaires",
    description: "Coordonnées et informations pratiques",
    icon: "✉",
    dataSource: "agency",
    defaults: {
      title: "Contactez votre agence",
      text:
        "Notre équipe est disponible pour répondre à toutes vos questions.",
    },
  },
  {
    id: "conversion-appointment",
    category: "conversion",
    type: "appointment",
    variant: "booking",
    label: "Prise de rendez-vous",
    description: "Inviter le visiteur à réserver un créneau",
    icon: "◷",
    defaults: {
      title: "Prenons le temps de parler de votre voyage",
      text:
        "Choisissez un créneau pour échanger avec un conseiller.",
      primaryButton: "Prendre rendez-vous",
    },
  },

  {
    id: "seo-faq",
    category: "seo",
    type: "faq",
    variant: "accordion",
    label: "Questions fréquentes",
    description: "FAQ visible et compatible Schema.org",
    icon: "?",
    defaults: {
      title: "Questions fréquentes",
      items: [
        {
          question: "Pourquoi réserver avec une agence de voyages ?",
          answer:
            "Vous bénéficiez de conseils personnalisés et d’un accompagnement complet.",
        },
      ],
    },
  },
  {
    id: "seo-map",
    category: "seo",
    type: "map",
    variant: "google",
    label: "Carte et itinéraire",
    description: "Localisation de l’agence",
    icon: "⌂",
    dataSource: "agency",
    defaults: {
      title: "Venir à l’agence",
    },
  },
  {
    id: "seo-rich-text",
    category: "seo",
    type: "rich-text",
    variant: "editorial",
    label: "Contenu éditorial",
    description: "Texte riche optimisé pour le référencement",
    icon: "T",
    defaults: {
      title: "Titre de la section",
      text:
        "Ajoutez ici votre contenu éditorial.",
      alignment: "left",
    },
  },
];

export function getSectionDefinition(templateId) {
  return (
    SECTION_LIBRARY.find(
      (section) => section.id === templateId
    ) || null
  );
}

export function createSectionBlock(definition) {
  const timestamp = Date.now();
  const random = Math.random()
    .toString(36)
    .slice(2, 8);

  return {
    id: `${definition.type}-${timestamp}-${random}`,
    type: definition.type,
    templateId: definition.id,
    variant: definition.variant,
    label: definition.label,
    enabled: true,
    settings: {
      ...structuredClone(definition.defaults || {}),
      __templateId: definition.id,
      __variant: definition.variant,
      __dataSource: definition.dataSource || null,
    },
  };
}
