"use strict";

const {
  createError,
} = require("./validation");

function isObject(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function clean(value, maximum) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximum);
}

function normalizeCta(value) {
  if (!isObject(value)) {
    return null;
  }

  const label =
    clean(value.label, 100);

  const href =
    clean(
      value.href || "#contact",
      300
    );

  if (!label) {
    return null;
  }

  return {
    label,
    href:
      href.startsWith("#") ||
      href.startsWith("/")
        ? href
        : "#contact",
  };
}

function normalizeFaqItem(value) {
  if (!isObject(value)) {
    return null;
  }

  const question =
    clean(value.question, 220);

  const answer =
    clean(value.answer, 1500);

  if (
    !question ||
    !answer
  ) {
    return null;
  }

  return {
    question,
    answer,
  };
}

function normalizeEditorialResponse(
  input,
  fallback
) {
  if (!isObject(input)) {
    throw createError(
      "La réponse du fournisseur IA est invalide.",
      "EDITORIAL_AI_INVALID_RESPONSE",
      502
    );
  }

  const page =
    isObject(input.page)
      ? input.page
      : {};

  const hero =
    isObject(input.hero)
      ? input.hero
      : {};

  const faq =
    isObject(input.faq)
      ? input.faq
      : {};

  const cta =
    isObject(input.cta)
      ? input.cta
      : {};

  const titles =
    Array.isArray(hero.titles)
      ? hero.titles
          .map(
            (value) =>
              clean(value, 140)
          )
          .filter(Boolean)
          .slice(0, 5)
      : [];

  const subtitles =
    Array.isArray(hero.subtitles)
      ? hero.subtitles
          .map(
            (value) =>
              clean(value, 600)
          )
          .filter(Boolean)
          .slice(0, 5)
      : [];

  const ctas =
    Array.isArray(hero.ctas)
      ? hero.ctas
          .map(normalizeCta)
          .filter(Boolean)
          .slice(0, 5)
      : [];

  const faqItems =
    Array.isArray(faq.items)
      ? faq.items
          .map(normalizeFaqItem)
          .filter(Boolean)
          .slice(0, 8)
      : [];

  return {
    destination:
      clean(
        input.destination ||
        fallback.destination,
        180
      ),

    agency:
      clean(
        input.agency ||
        fallback.agency,
        180
      ),

    page: {
      title:
        clean(
          page.title ||
          fallback.page.title,
          180
        ),

      slug:
        clean(
          page.slug ||
          fallback.page.slug,
          120
        ),

      seoTitle:
        clean(
          page.seoTitle ||
          fallback.page.seoTitle,
          70
        ),

      seoDescription:
        clean(
          page.seoDescription ||
          fallback.page
            .seoDescription,
          180
        ),
    },

    hero: {
      titles:
        titles.length
          ? titles
          : fallback.hero.titles,

      subtitles:
        subtitles.length
          ? subtitles
          : fallback.hero
              .subtitles,

      ctas:
        ctas.length
          ? ctas
          : fallback.hero.ctas,
    },

    faq: {
      title:
        clean(
          faq.title ||
          fallback.faq.title,
          180
        ),

      items:
        faqItems.length
          ? faqItems
          : fallback.faq.items,
    },

    cta: {
      title:
        clean(
          cta.title ||
          fallback.cta.title,
          180
        ),

      text:
        clean(
          cta.text ||
          fallback.cta.text,
          1200
        ),

      actions:
        Array.isArray(
          cta.actions
        )
          ? cta.actions
              .map(normalizeCta)
              .filter(Boolean)
              .slice(0, 5)
          : fallback.cta.actions,
    },
  };
}

module.exports = {
  normalizeEditorialResponse,
};
