"use strict";

export const TRAVEL_PAGE_TEMPLATES = [
  {
    id: "destination-premium",
    label: "Destination Premium",
    description:
      "Page immersive pour une destination haut de gamme.",
    category: "destination",
    icon: "✦",
    tags: [
      "premium",
      "luxe",
      "destination",
      "seo",
    ],
    variables: {
      destination: "Île Maurice",
      agency: "votre agence",
    },
    page: {
      title:
        "Voyage à {{destination}}",
      seoTitle:
        "Voyage à {{destination}} avec {{agency}}",
      seoDescription:
        "Préparez votre voyage à {{destination}} avec les conseils personnalisés de {{agency}}.",
    },
    blocks: [
      {
        type: "hero",
        content: {
          eyebrow:
            "Voyage d’exception",
          title:
            "Découvrez {{destination}}",
          subtitle:
            "Une destination unique, sélectionnée et organisée avec soin par {{agency}}.",
          imageUrl: "",
          imageAlt:
            "Voyage à {{destination}}",
          primaryCta: {
            label:
              "Demander un devis",
            href: "#contact",
          },
          alignment: "left",
        },
      },
      {
        type: "rich_text",
        content: {
          title:
            "Pourquoi partir à {{destination}} ?",
          html:
            "<p>{{destination}} offre un équilibre exceptionnel entre paysages, expériences et art de vivre.</p>",
          alignment: "left",
        },
      },
      {
        type: "features",
        content: {
          title:
            "Les incontournables de {{destination}}",
          introduction: "",
          columns: 3,
          items: [
            {
              icon: "✦",
              title:
                "Expériences exclusives",
              text:
                "Des moments soigneusement sélectionnés.",
            },
            {
              icon: "☀",
              title:
                "Période idéale",
              text:
                "Nos conseillers identifient la meilleure saison.",
            },
            {
              icon: "⌂",
              title:
                "Accompagnement",
              text:
                "Un suivi avant, pendant et après votre voyage.",
            },
          ],
        },
      },
      {
        type: "gallery",
        content: {
          title:
            "{{destination}} en images",
          columns: 3,
          images: [],
        },
      },
      {
        type: "faq",
        content: {
          title:
            "Questions fréquentes sur {{destination}}",
          items: [
            {
              question:
                "Quand partir à {{destination}} ?",
              answer:
                "Votre conseiller vous orientera selon le climat, votre budget et vos envies.",
            },
            {
              question:
                "Quel budget prévoir ?",
              answer:
                "Le budget dépend de la saison, du niveau d’hébergement et des prestations souhaitées.",
            },
          ],
        },
      },
      {
        type: "cta",
        content: {
          title:
            "Construisons votre voyage à {{destination}}",
          text:
            "Échangez avec un conseiller de {{agency}}.",
          primaryCta: {
            label:
              "Demander un devis",
            href: "#contact",
          },
          secondaryCta: null,
          style: "primary",
        },
      },
      {
        type: "agency",
        content: {
          title:
            "{{agency}} vous accompagne",
          showAddress: true,
          showPhone: true,
          showEmail: true,
          showHours: true,
          showMap: false,
        },
      },
    ],
  },

  {
    id: "voyage-de-noces",
    label: "Voyage de noces",
    description:
      "Page romantique destinée aux lunes de miel.",
    category: "thématique",
    icon: "♥",
    tags: [
      "noces",
      "romantique",
      "couple",
      "luxe",
    ],
    variables: {
      destination: "Maldives",
      agency: "votre agence",
    },
    page: {
      title:
        "Voyage de noces à {{destination}}",
      seoTitle:
        "Voyage de noces à {{destination}} sur mesure",
      seoDescription:
        "Imaginez votre lune de miel à {{destination}} avec les conseils de {{agency}}.",
    },
    blocks: [
      {
        type: "hero",
        content: {
          eyebrow:
            "Voyage de noces",
          title:
            "Votre lune de miel à {{destination}}",
          subtitle:
            "Un voyage unique pour célébrer votre histoire.",
          imageUrl: "",
          imageAlt:
            "Voyage de noces à {{destination}}",
          primaryCta: {
            label:
              "Créer notre voyage",
            href: "#contact",
          },
          alignment: "center",
        },
      },
      {
        type: "image_text",
        content: {
          title:
            "Une expérience pensée pour deux",
          text:
            "Hébergement d’exception, attentions personnalisées et expériences romantiques composent votre séjour.",
          imageUrl: "",
          imageAlt:
            "Séjour romantique à {{destination}}",
          imagePosition: "left",
        },
      },
      {
        type: "features",
        content: {
          title:
            "Votre voyage de noces sur mesure",
          introduction: "",
          columns: 3,
          items: [
            {
              icon: "♥",
              title:
                "Hôtels romantiques",
              text:
                "Une sélection adaptée aux jeunes mariés.",
            },
            {
              icon: "✦",
              title:
                "Expériences privées",
              text:
                "Des souvenirs conçus exclusivement pour vous.",
            },
            {
              icon: "✓",
              title:
                "Organisation complète",
              text:
                "Votre agence coordonne chaque étape.",
            },
          ],
        },
      },
      {
        type: "faq",
        content: {
          title:
            "Préparer votre lune de miel",
          items: [
            {
              question:
                "Combien de temps à l’avance réserver ?",
              answer:
                "Une anticipation de six à douze mois permet généralement un choix plus large.",
            },
            {
              question:
                "Peut-on créer une liste de mariage ?",
              answer:
                "Votre conseiller peut vous présenter les solutions disponibles.",
            },
          ],
        },
      },
      {
        type: "cta",
        content: {
          title:
            "Imaginez votre voyage à deux",
          text:
            "Confiez votre projet à {{agency}}.",
          primaryCta: {
            label:
              "Prendre rendez-vous",
            href: "#contact",
          },
          secondaryCta: null,
          style: "primary",
        },
      },
    ],
  },

  {
    id: "circuit-accompagne",
    label: "Circuit accompagné",
    description:
      "Page orientée découverte, itinéraire et accompagnement.",
    category: "produit",
    icon: "◎",
    tags: [
      "circuit",
      "guide",
      "itinéraire",
      "groupe",
    ],
    variables: {
      destination: "Vietnam",
      agency: "votre agence",
    },
    page: {
      title:
        "Circuit accompagné au {{destination}}",
      seoTitle:
        "Circuit accompagné au {{destination}}",
      seoDescription:
        "Découvrez le {{destination}} grâce à un circuit accompagné sélectionné par {{agency}}.",
    },
    blocks: [
      {
        type: "hero",
        content: {
          eyebrow:
            "Circuit accompagné",
          title:
            "Partez à la découverte du {{destination}}",
          subtitle:
            "Un itinéraire équilibré, un guide et une organisation maîtrisée.",
          imageUrl: "",
          imageAlt:
            "Circuit accompagné au {{destination}}",
          primaryCta: {
            label:
              "Découvrir les circuits",
            href: "#contact",
          },
          alignment: "left",
        },
      },
      {
        type: "features",
        content: {
          title:
            "Pourquoi choisir un circuit accompagné ?",
          introduction: "",
          columns: 3,
          items: [
            {
              icon: "◎",
              title:
                "Itinéraire optimisé",
              text:
                "Découvrez les étapes essentielles sans perdre de temps.",
            },
            {
              icon: "♟",
              title:
                "Guide expérimenté",
              text:
                "Comprenez la culture et l’histoire de la destination.",
            },
            {
              icon: "✓",
              title:
                "Organisation simplifiée",
              text:
                "Transports, visites et hébergements sont coordonnés.",
            },
          ],
        },
      },
      {
        type: "rich_text",
        content: {
          title:
            "Un voyage riche en découvertes",
          html:
            "<p>Le circuit accompagné permet de découvrir le {{destination}} avec un rythme maîtrisé et des prestations organisées.</p>",
          alignment: "left",
        },
      },
      {
        type: "faq",
        content: {
          title:
            "Questions sur les circuits au {{destination}}",
          items: [
            {
              question:
                "Quel est le rythme du circuit ?",
              answer:
                "Le rythme varie selon le programme et le nombre d’étapes.",
            },
            {
              question:
                "Les repas sont-ils inclus ?",
              answer:
                "Les prestations incluses sont précisées dans chaque programme.",
            },
          ],
        },
      },
      {
        type: "cta",
        content: {
          title:
            "Trouvez votre circuit au {{destination}}",
          text:
            "Votre conseiller compare les itinéraires et les prestations.",
          primaryCta: {
            label:
              "Recevoir une sélection",
            href: "#contact",
          },
          secondaryCta: null,
          style: "primary",
        },
      },
    ],
  },

  {
    id: "safari",
    label: "Safari",
    description:
      "Page pour safaris, parcs naturels et voyages animaliers.",
    category: "thématique",
    icon: "♞",
    tags: [
      "safari",
      "animaux",
      "afrique",
      "nature",
    ],
    variables: {
      destination: "Tanzanie",
      agency: "votre agence",
    },
    page: {
      title:
        "Safari en {{destination}}",
      seoTitle:
        "Safari en {{destination}} avec {{agency}}",
      seoDescription:
        "Préparez votre safari en {{destination}} avec une sélection adaptée à vos envies.",
    },
    blocks: [
      {
        type: "hero",
        content: {
          eyebrow: "Safari",
          title:
            "Vivez un safari inoubliable en {{destination}}",
          subtitle:
            "Grands espaces, faune sauvage et lodges d’exception.",
          imageUrl: "",
          imageAlt:
            "Safari en {{destination}}",
          primaryCta: {
            label:
              "Préparer mon safari",
            href: "#contact",
          },
          alignment: "left",
        },
      },
      {
        type: "features",
        content: {
          title:
            "Les temps forts de votre safari",
          introduction: "",
          columns: 3,
          items: [
            {
              icon: "♞",
              title:
                "Observation animale",
              text:
                "Partez à la rencontre d’une faune exceptionnelle.",
            },
            {
              icon: "☀",
              title:
                "Paysages spectaculaires",
              text:
                "Savanes, réserves et panoramas naturels.",
            },
            {
              icon: "⌂",
              title:
                "Lodges sélectionnés",
              text:
                "Confort et immersion au cœur de la nature.",
            },
          ],
        },
      },
      {
        type: "gallery",
        content: {
          title:
            "La {{destination}} sauvage",
          columns: 3,
          images: [],
        },
      },
      {
        type: "faq",
        content: {
          title:
            "Bien préparer son safari",
          items: [
            {
              question:
                "Quelle est la meilleure période ?",
              answer:
                "La période dépend des régions, du climat et des migrations animales.",
            },
            {
              question:
                "Le safari convient-il aux familles ?",
              answer:
                "Certains itinéraires et lodges sont particulièrement adaptés aux familles.",
            },
          ],
        },
      },
      {
        type: "cta",
        content: {
          title:
            "Construisons votre safari",
          text:
            "{{agency}} vous conseille sur l’itinéraire et les hébergements.",
          primaryCta: {
            label:
              "Demander un devis",
            href: "#contact",
          },
          secondaryCta: null,
          style: "dark",
        },
      },
    ],
  },

  {
    id: "city-break",
    label: "City Break",
    description:
      "Page courte et dynamique pour un séjour urbain.",
    category: "produit",
    icon: "▥",
    tags: [
      "ville",
      "week-end",
      "court séjour",
      "culture",
    ],
    variables: {
      destination: "Budapest",
      agency: "votre agence",
    },
    page: {
      title:
        "City break à {{destination}}",
      seoTitle:
        "Week-end et city break à {{destination}}",
      seoDescription:
        "Découvrez {{destination}} le temps d’un week-end organisé avec {{agency}}.",
    },
    blocks: [
      {
        type: "hero",
        content: {
          eyebrow: "City break",
          title:
            "Évadez-vous à {{destination}}",
          subtitle:
            "Culture, gastronomie et découverte le temps de quelques jours.",
          imageUrl: "",
          imageAlt:
            "City break à {{destination}}",
          primaryCta: {
            label:
              "Recevoir une proposition",
            href: "#contact",
          },
          alignment: "left",
        },
      },
      {
        type: "features",
        content: {
          title:
            "{{destination}} en quelques jours",
          introduction: "",
          columns: 3,
          items: [
            {
              icon: "▥",
              title:
                "Patrimoine",
              text:
                "Les sites incontournables de la ville.",
            },
            {
              icon: "✦",
              title:
                "Expériences",
              text:
                "Des activités adaptées à la durée du séjour.",
            },
            {
              icon: "⌂",
              title:
                "Hébergement",
              text:
                "Une adresse idéalement située.",
            },
          ],
        },
      },
      {
        type: "rich_text",
        content: {
          title:
            "Pourquoi choisir {{destination}} ?",
          html:
            "<p>{{destination}} est idéale pour une escapade dépaysante, accessible et riche en découvertes.</p>",
          alignment: "left",
        },
      },
      {
        type: "cta",
        content: {
          title:
            "Votre prochain week-end commence ici",
          text:
            "Vol, train, hôtel et activités : {{agency}} organise votre séjour.",
          primaryCta: {
            label:
              "Préparer mon week-end",
            href: "#contact",
          },
          secondaryCta: null,
          style: "primary",
        },
      },
    ],
  },

  {
    id: "voyage-famille",
    label: "Voyage en famille",
    description:
      "Page rassurante pour familles avec enfants.",
    category: "thématique",
    icon: "♙",
    tags: [
      "famille",
      "enfants",
      "club",
      "vacances",
    ],
    variables: {
      destination: "Crète",
      agency: "votre agence",
    },
    page: {
      title:
        "Voyage en famille en {{destination}}",
      seoTitle:
        "Vacances en famille en {{destination}}",
      seoDescription:
        "Préparez vos vacances en famille en {{destination}} avec les conseils de {{agency}}.",
    },
    blocks: [
      {
        type: "hero",
        content: {
          eyebrow:
            "Vacances en famille",
          title:
            "Partez en famille en {{destination}}",
          subtitle:
            "Des vacances adaptées aux petits comme aux grands.",
          imageUrl: "",
          imageAlt:
            "Vacances en famille en {{destination}}",
          primaryCta: {
            label:
              "Trouver notre séjour",
            href: "#contact",
          },
          alignment: "left",
        },
      },
      {
        type: "features",
        content: {
          title:
            "Des vacances pensées pour toute la famille",
          introduction: "",
          columns: 3,
          items: [
            {
              icon: "♙",
              title:
                "Hôtels adaptés",
              text:
                "Chambres familiales, clubs enfants et services pratiques.",
            },
            {
              icon: "☀",
              title:
                "Activités variées",
              text:
                "Des expériences pour tous les âges.",
            },
            {
              icon: "✓",
              title:
                "Voyage sécurisé",
              text:
                "Une organisation claire et un accompagnement disponible.",
            },
          ],
        },
      },
      {
        type: "faq",
        content: {
          title:
            "Questions des familles",
          items: [
            {
              question:
                "Quels hôtels proposent un club enfant ?",
              answer:
                "Votre conseiller vérifie l’âge accepté et les périodes d’ouverture.",
            },
            {
              question:
                "Comment choisir les bons horaires de transport ?",
              answer:
                "Nous privilégions les horaires compatibles avec le rythme de votre famille.",
            },
          ],
        },
      },
      {
        type: "cta",
        content: {
          title:
            "Préparons vos prochaines vacances",
          text:
            "{{agency}} recherche la formule la plus adaptée à votre famille.",
          primaryCta: {
            label:
              "Demander une proposition",
            href: "#contact",
          },
          secondaryCta: null,
          style: "soft",
        },
      },
    ],
  },

  {
    id: "croisiere",
    label: "Croisière",
    description:
      "Page destinée aux croisières maritimes ou fluviales.",
    category: "produit",
    icon: "≋",
    tags: [
      "croisière",
      "bateau",
      "itinéraire",
      "escales",
    ],
    variables: {
      destination: "Méditerranée",
      agency: "votre agence",
    },
    page: {
      title:
        "Croisière en {{destination}}",
      seoTitle:
        "Croisière en {{destination}} avec {{agency}}",
      seoDescription:
        "Découvrez les croisières en {{destination}} sélectionnées par {{agency}}.",
    },
    blocks: [
      {
        type: "hero",
        content: {
          eyebrow: "Croisière",
          title:
            "Naviguez en {{destination}}",
          subtitle:
            "Plusieurs destinations, un seul voyage et une organisation simplifiée.",
          imageUrl: "",
          imageAlt:
            "Croisière en {{destination}}",
          primaryCta: {
            label:
              "Découvrir les croisières",
            href: "#contact",
          },
          alignment: "left",
        },
      },
      {
        type: "features",
        content: {
          title:
            "Les avantages de la croisière",
          introduction: "",
          columns: 3,
          items: [
            {
              icon: "≋",
              title:
                "Plusieurs escales",
              text:
                "Découvrez plusieurs destinations sans refaire vos bagages.",
            },
            {
              icon: "⌂",
              title:
                "Confort à bord",
              text:
                "Hébergement, restauration et loisirs réunis.",
            },
            {
              icon: "✓",
              title:
                "Conseil personnalisé",
              text:
                "Navire, cabine et itinéraire sont choisis selon vos attentes.",
            },
          ],
        },
      },
      {
        type: "rich_text",
        content: {
          title:
            "Choisir la bonne croisière",
          html:
            "<p>Compagnie, taille du navire, escales et type de cabine influencent fortement l’expérience.</p>",
          alignment: "left",
        },
      },
      {
        type: "faq",
        content: {
          title:
            "Questions fréquentes sur les croisières",
          items: [
            {
              question:
                "Quelle cabine choisir ?",
              answer:
                "Le choix dépend du budget, de la luminosité souhaitée et de l’emplacement à bord.",
            },
            {
              question:
                "Les boissons sont-elles incluses ?",
              answer:
                "Les formules varient selon les compagnies et les tarifs.",
            },
          ],
        },
      },
      {
        type: "cta",
        content: {
          title:
            "Trouvez votre prochaine croisière",
          text:
            "{{agency}} compare les itinéraires, navires et catégories de cabine.",
          primaryCta: {
            label:
              "Recevoir une sélection",
            href: "#contact",
          },
          secondaryCta: null,
          style: "primary",
        },
      },
    ],
  },

  {
    id: "page-seo-guide",
    label: "Guide SEO destination",
    description:
      "Structure éditoriale pour une page informative à fort potentiel SEO.",
    category: "seo",
    icon: "¶",
    tags: [
      "guide",
      "seo",
      "conseils",
      "destination",
    ],
    variables: {
      destination: "Seychelles",
      agency: "votre agence",
    },
    page: {
      title:
        "Guide de voyage {{destination}}",
      seoTitle:
        "Guide {{destination}} : conseils et informations",
      seoDescription:
        "Climat, budget, formalités et conseils : préparez votre voyage à {{destination}}.",
    },
    blocks: [
      {
        type: "hero",
        content: {
          eyebrow:
            "Guide de voyage",
          title:
            "Bien préparer votre voyage à {{destination}}",
          subtitle:
            "Toutes les informations utiles avant votre départ.",
          imageUrl: "",
          imageAlt:
            "Guide de voyage {{destination}}",
          primaryCta: {
            label:
              "Parler à un conseiller",
            href: "#contact",
          },
          alignment: "left",
        },
      },
      {
        type: "rich_text",
        content: {
          title:
            "Découvrir {{destination}}",
          html:
            "<p>Retrouvez les informations essentielles pour organiser votre séjour à {{destination}}.</p>",
          alignment: "left",
        },
      },
      {
        type: "features",
        content: {
          title:
            "Préparer votre séjour",
          introduction: "",
          columns: 3,
          items: [
            {
              icon: "☀",
              title:
                "Quand partir",
              text:
                "Climat, saisons et périodes recommandées.",
            },
            {
              icon: "€",
              title:
                "Budget",
              text:
                "Transport, hébergement et dépenses sur place.",
            },
            {
              icon: "✓",
              title:
                "Formalités",
              text:
                "Documents et conditions d’entrée à vérifier.",
            },
          ],
        },
      },
      {
        type: "faq",
        content: {
          title:
            "Questions pratiques sur {{destination}}",
          items: [
            {
              question:
                "Quelle est la meilleure période pour partir ?",
              answer:
                "La meilleure période dépend du climat recherché et des activités prévues.",
            },
            {
              question:
                "Quelles formalités prévoir ?",
              answer:
                "Les formalités doivent être vérifiées selon votre nationalité et votre situation.",
            },
            {
              question:
                "Quel budget prévoir ?",
              answer:
                "Votre conseiller construit une estimation selon la durée et le niveau de prestation.",
            },
          ],
        },
      },
      {
        type: "cta",
        content: {
          title:
            "Besoin de conseils personnalisés ?",
          text:
            "{{agency}} vous accompagne dans la préparation de votre voyage.",
          primaryCta: {
            label:
              "Contacter l’agence",
            href: "#contact",
          },
          secondaryCta: null,
          style: "primary",
        },
      },
    ],
  },
];
