"use strict";

const {
  cleanText,
  compact,
  truncate,
} = require("./utils");

function block(
  type,
  content,
  options = {}
) {
  return {
    type,

    status:
      options.status ||
      "draft",

    required:
      options.required !==
      false,

    source:
      options.source ||
      "blueprint",

    content:
      compact(
        content || {}
      ),

    settings:
      options.settings ||
      {},

    seo:
      options.seo ||
      {},

    visibleDesktop:
      options.visibleDesktop !==
      false,

    visibleMobile:
      options.visibleMobile !==
      false,
  };
}

function heroBlock(
  context,
  page
) {
  const citySuffix =
    context.city
      ? ` à ${context.city}`
      : "";

  return block(
    "hero",
    {
      eyebrow:
        page.eyebrow ||
        context.blueprint
          .toUpperCase(),

      title:
        page.heroTitle ||
        `${page.title}${citySuffix}`,

      subtitle:
        page.heroSubtitle ||
        context.description ||
        `Votre agence de voyages vous accompagne dans la création de séjours personnalisés.`,

      primaryCtaLabel:
        page.primaryCtaLabel ||
        "Construire mon voyage",

      primaryCtaHref:
        "/contact",

      secondaryCtaLabel:
        "Découvrir l’agence",

      secondaryCtaHref:
        "/agence",
    },
    {
      required:
        true,
    }
  );
}

function introBlock(
  context,
  page
) {
  return block(
    "text",
    {
      title:
        page.introTitle ||
        page.title,

      text:
        page.introText ||
        context.description ||
        `${context.agencyName} accompagne ses clients avec conseil, expertise et suivi personnalisé avant, pendant et après leur voyage.`,
    }
  );
}

function uspBlock(
  context
) {
  return block(
    "features",
    {
      title:
        "Pourquoi choisir notre agence ?",

      items: [
        {
          title:
            "Conseil personnalisé",

          text:
            "Un accompagnement humain adapté à votre projet et à votre budget.",
        },
        {
          title:
            "Experts du voyage",

          text:
            "Des conseillers expérimentés et des partenaires sélectionnés.",
        },
        {
          title:
            "Suivi complet",

          text:
            "Une équipe disponible avant, pendant et après votre départ.",
        },
      ],
    }
  );
}

function destinationsBlock(
  context
) {
  const destinations =
    context.destinations.length
      ? context.destinations
      : [
          "Île Maurice",
          "Seychelles",
          "Maldives",
          "Thaïlande",
          "République dominicaine",
          "Canaries",
        ];

  return block(
    "destination-grid",
    {
      title:
        "Nos idées de destinations",

      subtitle:
        "Des voyages sélectionnés selon vos envies.",

      items:
        destinations
          .slice(
            0,
            12
          )
          .map(
            (destination) => ({
              title:
                destination,

              href:
                `/destinations/${destination
                  .normalize("NFD")
                  .replace(
                    /[\u0300-\u036f]/g,
                    ""
                  )
                  .toLowerCase()
                  .replace(
                    /[^a-z0-9]+/g,
                    "-"
                  )
                  .replace(
                    /^-+|-+$/g,
                    ""
                  )}`,
            })
          ),
    }
  );
}

function servicesBlock(
  context
) {
  const services =
    context.services.length
      ? context.services
      : [
          "Séjours et circuits",
          "Voyages sur mesure",
          "Croisières",
          "Billetterie",
          "Voyages de noces",
          "Groupes",
        ];

  return block(
    "services",
    {
      title:
        "Nos services",

      items:
        services.map(
          (service) => ({
            title:
              service,

            text:
              `Notre équipe vous conseille pour votre projet ${service.toLowerCase()}.`,
          })
        ),
    }
  );
}

function teamBlock(
  context
) {
  const members =
    context.teamMembers.length
      ? context.teamMembers
      : [
          {
            name:
              "Votre équipe",

            role:
              "Conseillers voyages",

            description:
              "Des professionnels disponibles pour construire votre prochain voyage.",
          },
        ];

  return block(
    "team",
    {
      title:
        "Une équipe à votre écoute",

      members,
    }
  );
}

function partnersBlock(
  context
) {
  const partners =
    context.partners.length
      ? context.partners
      : [
          "FRAM",
          "TUI",
          "Lookéa",
          "Marmara",
          "Kappa",
          "Boomerang",
        ];

  return block(
    "logos",
    {
      title:
        "Nos partenaires voyage",

      items:
        partners.map(
          (name) => ({
            name,
          })
        ),
    },
    {
      required:
        false,
    }
  );
}

function reviewsBlock() {
  return block(
    "reviews",
    {
      title:
        "Ils nous font confiance",

      subtitle:
        "Découvrez les retours de nos voyageurs.",
    },
    {
      source:
        "google-business",

      required:
        false,
    }
  );
}

function faqBlock(
  page
) {
  const subject =
    cleanText(
      page.faqSubject ||
      page.title
    );

  return block(
    "faq",
    {
      title:
        `Questions fréquentes sur ${subject.toLowerCase()}`,

      items: [
        {
          question:
            `Pourquoi passer par une agence pour ${subject.toLowerCase()} ?`,

          answer:
            "Une agence vous fait gagner du temps, sécurise votre réservation et vous accompagne en cas d’imprévu.",
        },
        {
          question:
            "Comment obtenir un devis personnalisé ?",

          answer:
            "Contactez notre équipe en agence, par téléphone ou grâce au formulaire de contact.",
        },
        {
          question:
            "Puis-je adapter le voyage à mon budget ?",

          answer:
            "Oui. Nos conseillers recherchent les solutions les plus adaptées à vos priorités et à votre budget.",
        },
      ],
    }
  );
}

function contactBlock(
  context
) {
  return block(
    "contact",
    {
      title:
        "Contactez votre agence",

      agencyName:
        context.agencyName,

      address:
        context.address,

      postalCode:
        context.postalCode,

      city:
        context.city,

      phone:
        context.phone,

      email:
        context.email,
    }
  );
}

function mapBlock(
  context
) {
  return block(
    "map",
    {
      title:
        "Nous trouver",

      address:
        [
          context.address,
          context.postalCode,
          context.city,
        ]
          .filter(Boolean)
          .join(" "),
    },
    {
      required:
        false,
    }
  );
}

function hoursBlock() {
  return block(
    "hours",
    {
      title:
        "Horaires d’ouverture",
    },
    {
      source:
        "agency-profile",

      required:
        false,
    }
  );
}

function ctaBlock(
  page
) {
  return block(
    "cta",
    {
      title:
        page.ctaTitle ||
        "Parlons de votre prochain voyage",

      text:
        page.ctaText ||
        "Nos conseillers sont disponibles pour construire un projet adapté à vos envies.",

      buttonLabel:
        "Demander un devis",

      buttonHref:
        "/contact",
    }
  );
}

function legalBlock(
  context,
  kind
) {
  const title =
    kind === "privacy"
      ? "Politique de confidentialité"
      : "Mentions légales";

  return block(
    "legal",
    {
      title,

      companyName:
        context.agencyName,

      text:
        kind === "privacy"
          ? "Cette page présente les principes applicables à la collecte et au traitement des données personnelles."
          : "Cette page présente les informations légales relatives à l’éditeur du mini-site.",
    }
  );
}

function breadcrumbsBlock(
  page
) {
  return block(
    "breadcrumbs",
    {
      items: [
        {
          label:
            "Accueil",

          href:
            "/",
        },
        {
          label:
            page.title,

          href:
            `/${page.slug}`,
        },
      ],
    },
    {
      required:
        false,
    }
  );
}

function seoForPage(
  context,
  page
) {
  const city =
    context.city
      ? ` à ${context.city}`
      : "";

  const title =
    page.seoTitle ||
    `${page.title}${city} | ${context.agencyName}`;

  const description =
    page.seoDescription ||
    `Découvrez ${page.title.toLowerCase()} avec ${context.agencyName}${city}. Conseils personnalisés, expertise voyage et accompagnement complet.`;

  return {
    title:
      truncate(
        title,
        65
      ),

    description:
      truncate(
        description,
        160
      ),

    canonicalPath:
      page.slug
        ? `/${page.slug}`
        : "/",

    robots: {
      index:
        page.index !== false,

      follow:
        true,
    },

    openGraph: {
      title:
        truncate(
          title,
          65
        ),

      description:
        truncate(
          description,
          160
        ),

      type:
        "website",
    },
  };
}

module.exports = {
  block,
  breadcrumbsBlock,
  contactBlock,
  ctaBlock,
  destinationsBlock,
  faqBlock,
  heroBlock,
  hoursBlock,
  introBlock,
  legalBlock,
  mapBlock,
  partnersBlock,
  reviewsBlock,
  seoForPage,
  servicesBlock,
  teamBlock,
  uspBlock,
};
