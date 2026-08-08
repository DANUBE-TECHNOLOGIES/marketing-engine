"use strict";

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function truncate(value, maximum) {
  const text = clean(value);

  if (text.length <= maximum) {
    return text;
  }

  return `${text
    .slice(0, maximum - 1)
    .replace(/\s+\S*$/, "")
    .trim()}…`;
}

function buildDeterministicSuggestions(
  payload
) {
  const destination =
    payload.context.destination;

  const agency =
    payload.context.agency ||
    "votre agence Mondescale";

  const intent =
    payload.context.intent ||
    "voyage sur mesure";

  const travelCore =
    payload.context.travelCore || {};

  const facts =
    travelCore.facts || {};

  const titles = [
    `Découvrez ${destination}`,
    `Votre voyage à ${destination} commence ici`,
    `${destination} : un voyage pensé pour vous`,
  ];

  const subtitles = [
    `Confiez votre projet à ${agency} et profitez de conseils personnalisés avant, pendant et après votre séjour.`,

    `Hébergements, transports, expériences et formalités : construisons ensemble votre voyage à ${destination}.`,

    `Une sélection personnalisée et un accompagnement humain pour découvrir ${destination} dans les meilleures conditions.`,
  ];

  const ctas = [
    {
      label:
        "Demander un devis personnalisé",
      href: "#contact",
    },
    {
      label:
        "Prendre rendez-vous",
      href: "#contact",
    },
    {
      label:
        "Recevoir une proposition",
      href: "#contact",
    },
  ];

  return {
    destination,
    agency,

    grounding: {
      available:
        travelCore.available === true,

      source:
        travelCore.source ||
        "travel-core",

      sourceFields:
        Array.isArray(
          travelCore.sourceFields
        )
          ? travelCore.sourceFields
          : [],

      factsUsed: {
        bestMonths:
          Array.isArray(
            facts.bestMonths
          )
            ? facts.bestMonths
            : [],

        highlights:
          Array.isArray(
            facts.highlights
          )
            ? facts.highlights
            : [],

        themes:
          Array.isArray(
            facts.themes
          )
            ? facts.themes
            : [],
      },
    },

    page: {
      title:
        `Voyage à ${destination}`,

      slug:
        slugify(
          `voyage ${destination}`
        ),

      seoTitle:
        truncate(
          `Voyage à ${destination} avec ${agency}`,
          60
        ),

      seoDescription:
        truncate(
          `Préparez votre ${intent} à ${destination} avec ${agency} : conseils personnalisés, hébergements, transports et accompagnement complet.`,
          160
        ),
    },

    hero: {
      titles,
      subtitles,
      ctas,
    },

    faq: {
      title:
        `Questions fréquentes sur ${destination}`,

      items: [
        {
          question:
            `Quand partir à ${destination} ?`,

          answer:
            `La période idéale dépend du climat, du budget et des expériences recherchées. ${agency} vous aide à choisir les dates les plus adaptées.`,
        },
        {
          question:
            `Quel budget prévoir pour ${destination} ?`,

          answer:
            "Le budget varie selon la saison, la durée, les transports et le niveau d’hébergement. Une proposition personnalisée permet d’obtenir une estimation fiable.",
        },
        {
          question:
            `Quelles formalités prévoir pour ${destination} ?`,

          answer:
            "Les formalités dépendent de votre nationalité, de votre situation et de la durée du séjour. Elles doivent être vérifiées avant la réservation puis avant le départ.",
        },
        {
          question:
            `Pourquoi réserver avec ${agency} ?`,

          answer:
            "Vous bénéficiez d’un interlocuteur disponible, de conseils personnalisés et d’un accompagnement avant, pendant et après votre voyage.",
        },
      ],
    },

    cta: {
      title:
        `Préparons votre voyage à ${destination}`,

      text:
        `Échangez avec ${agency} pour construire une proposition adaptée à vos envies, à vos dates et à votre budget.`,

      actions:
        ctas,
    },
  };
}

module.exports = {
  buildDeterministicSuggestions,
  slugify,
  truncate,
};
