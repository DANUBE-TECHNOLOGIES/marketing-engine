"use strict";

import {
  BlockSdkError,
  clone,
} from "./sdk/index.mjs";

import {
  normalizeSlug,
} from "./seo-engine.mjs";

function clean(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(value) {
  const normalized = clean(value);

  if (!normalized) return "";

  return normalized
    .charAt(0)
    .toUpperCase() +
    normalized.slice(1);
}

function truncate(value, maximum) {
  const normalized = clean(value);

  if (normalized.length <= maximum) {
    return normalized;
  }

  const shortened = normalized
    .slice(0, maximum - 1)
    .replace(/\s+\S*$/, "")
    .trim();

  return `${shortened}…`;
}

function findBlock(page, type) {
  return page?.blocks?.find(
    (block) =>
      block.type === type
  ) || null;
}

function inferDestination(page, context = {}) {
  const explicit = clean(
    context.destination
  );

  if (explicit) return explicit;

  const hero = findBlock(
    page,
    "hero"
  );

  const sources = [
    hero?.content?.title,
    page?.title,
    page?.seoTitle,
    page?.slug
      ?.replace(/-/g, " "),
  ].filter(Boolean);

  const prefixes = [
    "voyage à ",
    "voyage au ",
    "voyage aux ",
    "séjour à ",
    "séjour au ",
    "séjour aux ",
    "découvrez ",
    "découvrir ",
    "circuit au ",
    "circuit en ",
    "safari en ",
    "croisière en ",
    "week-end à ",
    "city break à ",
  ];

  for (const source of sources) {
    const value = clean(source);
    const lower = value.toLowerCase();

    for (const prefix of prefixes) {
      const position =
        lower.indexOf(prefix);

      if (position >= 0) {
        const destination = value
          .slice(
            position +
            prefix.length
          )
          .split(
            /[|–—,:]/
          )[0]
          .trim();

        if (destination) {
          return destination;
        }
      }
    }
  }

  return "votre prochaine destination";
}

function inferAgency(context = {}) {
  return clean(
    context.agency ||
    context.agencyName
  ) || "votre agence Mondescale";
}

function destinationPreposition(destination) {
  const value = clean(destination);

  if (!value) {
    return "vers votre prochaine destination";
  }

  const lower = value.toLowerCase();

  if (
    lower.startsWith("les ") ||
    lower.startsWith("maldives") ||
    lower.startsWith("seychelles")
  ) {
    return `aux ${value.replace(/^les\s+/i, "")}`;
  }

  const feminineCountries = [
    "france",
    "grèce",
    "crète",
    "tanzanie",
    "thaïlande",
    "république dominicaine",
    "turquie",
    "croatie",
    "jordanie",
    "namibie",
  ];

  if (
    feminineCountries.some(
      (country) =>
        lower === country
    )
  ) {
    return `en ${value}`;
  }

  if (
    /^[aeiouyéèêëàâäîïôöùûü]/i.test(
      value
    )
  ) {
    return `à ${value}`;
  }

  return `à ${value}`;
}

export function buildEditorialSuggestions(
  page,
  context = {}
) {
  if (!page) {
    throw new BlockSdkError(
      "Aucune page à analyser.",
      "EDITORIAL_PAGE_REQUIRED"
    );
  }

  const destination =
    inferDestination(
      page,
      context
    );

  const agency =
    inferAgency(context);

  const location =
    destinationPreposition(
      destination
    );

  const pageIntent = clean(
    context.intent ||
    "voyage sur mesure"
  );

  const heroTitles = [
    `Découvrez ${destination}`,
    `Votre voyage ${location} commence ici`,
    `${destination} : un voyage pensé pour vous`,
  ];

  const heroSubtitles = [
    `Confiez votre projet à ${agency} et profitez de conseils personnalisés avant, pendant et après votre séjour.`,
    `Hébergements, transports, expériences et formalités : nous construisons avec vous un voyage adapté à vos envies.`,
    `Une sélection personnalisée, un accompagnement humain et une organisation maîtrisée pour découvrir ${destination}.`,
  ];

  const ctas = [
    {
      label:
        "Demander un devis personnalisé",
      href: "#contact",
    },
    {
      label:
        "Prendre rendez-vous avec un conseiller",
      href: "#contact",
    },
    {
      label:
        "Recevoir une proposition de voyage",
      href: "#contact",
    },
  ];

  const faqItems = [
    {
      question:
        `Quelle est la meilleure période pour partir ${location} ?`,
      answer:
        `La période idéale dépend du climat recherché, de votre budget et des expériences souhaitées. Votre conseiller ${agency} vous aide à identifier les dates les plus adaptées.`,
    },
    {
      question:
        `Quel budget prévoir pour un voyage ${location} ?`,
      answer:
        `Le budget varie selon la saison, la durée, les transports et le niveau d’hébergement. Une proposition personnalisée permet d’obtenir une estimation fiable.`,
    },
    {
      question:
        `Quelles formalités faut-il prévoir pour ${destination} ?`,
      answer:
        `Les formalités dépendent de votre nationalité, de la durée du séjour et de votre situation personnelle. Elles doivent être vérifiées avant toute réservation puis à nouveau avant le départ.`,
    },
    {
      question:
        `Pourquoi réserver ce voyage avec ${agency} ?`,
      answer:
        `Vous bénéficiez d’un interlocuteur disponible, d’une sélection adaptée à vos attentes et d’un accompagnement avant, pendant et après votre voyage.`,
    },
  ];

  const seoTitle = truncate(
    `Voyage ${location} sur mesure avec ${agency}`,
    60
  );

  const seoDescription = truncate(
    `Préparez votre ${pageIntent} ${location} avec ${agency} : conseils personnalisés, sélection d’hébergements, transports et accompagnement complet.`,
    160
  );

  return {
    destination,
    agency,

    page: {
      title:
        `Voyage ${location}`,
      slug:
        normalizeSlug(
          `voyage ${destination}`
        ),
      seoTitle,
      seoDescription,
    },

    hero: {
      titles: heroTitles,
      subtitles:
        heroSubtitles,
      ctas,
    },

    faq: {
      title:
        `Questions fréquentes sur ${destination}`,
      items: faqItems,
    },

    cta: {
      title:
        `Préparons votre voyage ${location}`,
      text:
        `Échangez avec ${agency} pour construire une proposition adaptée à vos envies, à vos dates et à votre budget.`,
      actions: ctas,
    },
  };
}

export function createEditorialPatch(
  page,
  suggestions,
  selection = {}
) {
  if (!page?.blocks) {
    throw new BlockSdkError(
      "La page est invalide.",
      "EDITORIAL_PAGE_REQUIRED"
    );
  }

  const next = clone(page);

  if (
    selection.pageSettings === true
  ) {
    next.title =
      suggestions.page.title;

    next.slug =
      suggestions.page.slug;

    next.seoTitle =
      suggestions.page.seoTitle;

    next.seoDescription =
      suggestions.page
        .seoDescription;
  }

  const hero = findBlock(
    next,
    "hero"
  );

  if (hero) {
    if (
      Number.isInteger(
        selection.heroTitleIndex
      )
    ) {
      hero.content = {
        ...(hero.content || {}),
        title:
          suggestions.hero.titles[
            selection.heroTitleIndex
          ],
      };
    }

    if (
      Number.isInteger(
        selection.heroSubtitleIndex
      )
    ) {
      hero.content = {
        ...(hero.content || {}),
        subtitle:
          suggestions.hero.subtitles[
            selection.heroSubtitleIndex
          ],
      };
    }

    if (
      Number.isInteger(
        selection.heroCtaIndex
      )
    ) {
      hero.content = {
        ...(hero.content || {}),
        primaryCta:
          clone(
            suggestions.hero.ctas[
              selection.heroCtaIndex
            ]
          ),
      };
    }
  }

  if (
    selection.faq === true
  ) {
    const faq = findBlock(
      next,
      "faq"
    );

    if (faq) {
      faq.content = {
        ...(faq.content || {}),
        title:
          suggestions.faq.title,
        items:
          clone(
            suggestions.faq.items
          ),
      };
    }
  }

  if (
    selection.cta === true
  ) {
    const cta = findBlock(
      next,
      "cta"
    );

    if (cta) {
      cta.content = {
        ...(cta.content || {}),
        title:
          suggestions.cta.title,
        text:
          suggestions.cta.text,
        primaryCta:
          clone(
            suggestions.cta.actions[0]
          ),
      };
    }
  }

  next.blocks = next.blocks.map(
    (block, index) => ({
      ...block,
      position: index,
    })
  );

  return next;
}

export function applyEditorialPatchToEditor(
  editor,
  suggestions,
  selection
) {
  if (!editor?.page) {
    throw new BlockSdkError(
      "Aucune page active.",
      "EDITOR_PAGE_REQUIRED"
    );
  }

  const page =
    createEditorialPatch(
      editor.page,
      suggestions,
      selection
    );

  return {
    ...editor,
    page,
    dirty: true,
    revision:
      editor.revision + 1,
  };
}

export {
  clean as cleanEditorialText,
  inferDestination,
  truncate as truncateEditorialText,
};
