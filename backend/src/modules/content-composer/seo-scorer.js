"use strict";

const {
  flattenText,
  containsNormalized,
  wordCount,
} =
  require(
    "./text-utils"
  );

function scoreSeo({
  content,
  context,
}) {
  let score =
    0;

  const checks =
    [];

  const sections =
    content.sections ||
    [];

  const body =
    flattenText(
      sections
    );

  const seo =
    content.seo ||
    {};

  const primaryKeyword =
    context?.seo
      ?.primaryKeyword ||
    "";

  const location =
    context?.seo
      ?.targetLocation ||
    context?.agency?.city ||
    "";

  const seoTitle =
    seo.title ||
    "";

  const description =
    seo.description ||
    "";

  function add({
    code,
    points,
    passed,
    detail =
      null,
  }) {
    if (
      passed
    ) {
      score +=
        points;
    }

    checks.push({
      code,
      points,
      passed,
      detail,
    });
  }

  add({
    code:
      "SEO_TITLE_PRESENT",

    points:
      15,

    passed:
      seoTitle.trim()
        .length >
      0,
  });

  add({
    code:
      "SEO_TITLE_LENGTH",

    points:
      10,

    passed:
      seoTitle.length >=
        30 &&
      seoTitle.length <=
        65,

    detail:
      seoTitle.length,
  });

  add({
    code:
      "META_DESCRIPTION_PRESENT",

    points:
      10,

    passed:
      description.trim()
        .length >
      0,
  });

  add({
    code:
      "META_DESCRIPTION_LENGTH",

    points:
      10,

    passed:
      description.length >=
        90 &&
      description.length <=
        170,

    detail:
      description.length,
  });

  add({
    code:
      "PRIMARY_KEYWORD_BODY",

    points:
      15,

    passed:
      primaryKeyword
        ? containsNormalized(
            body,
            primaryKeyword
          )
        : true,
  });

  add({
    code:
      "PRIMARY_KEYWORD_TITLE",

    points:
      10,

    passed:
      primaryKeyword
        ? containsNormalized(
            seoTitle,
            primaryKeyword
          )
        : true,
  });

  add({
    code:
      "LOCATION_BODY",

    points:
      10,

    passed:
      location
        ? containsNormalized(
            body,
            location
          )
        : true,
  });

  add({
    code:
      "LOCATION_TITLE",

    points:
      10,

    passed:
      location
        ? containsNormalized(
            seoTitle,
            location
          )
        : true,
  });

  const totalWords =
    wordCount(
      body
    );

  add({
    code:
      "MINIMUM_CONTENT",

    points:
      10,

    passed:
      totalWords >=
      120,

    detail:
      totalWords,
  });

  return {
    score:
      Math.min(
        score,
        100
      ),

    checks,

    metrics: {
      words:
        totalWords,

      titleLength:
        seoTitle.length,

      descriptionLength:
        description.length,
    },
  };
}

module.exports = {
  scoreSeo,
};
