"use strict";

const {
  cleanText,
  normalizeBlockType,
  pageUrl,
} = require("./utils");

function extractFaqItems(
  blocks = []
) {
  const questions = [];

  for (
    const block
    of blocks
  ) {
    if (
      normalizeBlockType(
        block
      ) !== "faq"
    ) {
      continue;
    }

    const items =
      Array.isArray(
        block.content?.items
      )
        ? block.content.items
        : [];

    for (
      const item
      of items
    ) {
      const question =
        cleanText(
          item.question ||
          item.title
        );

      const answer =
        cleanText(
          item.answer ||
          item.text
        );

      if (
        !question ||
        !answer
      ) {
        continue;
      }

      questions.push({
        "@type":
          "Question",

        name:
          question,

        acceptedAnswer: {
          "@type":
            "Answer",

          text:
            answer,
        },
      });
    }
  }

  return questions;
}

function buildFaqPage({
  site,
  page,
  publicOrigin,
} = {}) {
  const mainEntity =
    extractFaqItems(
      page.blocks
    );

  if (
    !mainEntity.length
  ) {
    return null;
  }

  return {
    "@type":
      "FAQPage",

    "@id":
      `${pageUrl(
        publicOrigin,
        site.slug,
        page.slug
      )}#faq`,

    mainEntity,
  };
}

module.exports = {
  buildFaqPage,
  extractFaqItems,
};
