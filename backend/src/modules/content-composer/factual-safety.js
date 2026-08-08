"use strict";

const {
  flattenText,
  normalizeText,
} =
  require(
    "./text-utils"
  );

function unique(
  values
) {
  return [
    ...new Set(
      values.filter(
        Boolean
      )
    ),
  ];
}

function findPhoneCandidates(
  text
) {
  return unique(
    String(
      text ||
      ""
    ).match(
      /(?:\+33|0)[1-9](?:[\s.\-]?\d{2}){4}/g
    ) ||
    []
  );
}

function findEmailCandidates(
  text
) {
  return unique(
    String(
      text ||
      ""
    ).match(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
    ) ||
    []
  );
}

function findPriceCandidates(
  text
) {
  /*
   * Formats couverts :
   *
   * 999 €
   * 999€
   * 1 490 €
   * 1490 EUR
   * 1490 euros
   * 1.490,50 €
   *
   * Important :
   * ne pas utiliser de word-boundary après le symbole euro.
   */
  const source =
    String(
      text ||
      ""
    );

  const matches =
    source.match(
      /\d[\d\s.,]{0,12}\s*(?:€|EUR|euros?)(?=$|[^\p{L}\p{N}])/giu
    ) ||
    [];

  return unique(
    matches.map(
      value =>
        value.trim()
    )
  );
}

function factualSafetyCheck({
  content,
  context,
}) {
  const text =
    flattenText(
      content
    );

  const issues =
    [];

  const agencyPhone =
    normalizeText(
      context?.agency?.phone
    );

  const agencyEmail =
    normalizeText(
      context?.agency?.email
    );

  const phones =
    findPhoneCandidates(
      text
    );

  for (
    const phone
    of phones
  ) {
    if (
      !agencyPhone ||
      normalizeText(
        phone
      ) !==
      agencyPhone
    ) {
      issues.push({
        code:
          "UNVERIFIED_PHONE",

        severity:
          "error",

        value:
          phone,
      });
    }
  }

  const emails =
    findEmailCandidates(
      text
    );

  for (
    const email
    of emails
  ) {
    if (
      !agencyEmail ||
      normalizeText(
        email
      ) !==
      agencyEmail
    ) {
      issues.push({
        code:
          "UNVERIFIED_EMAIL",

        severity:
          "error",

        value:
          email,
      });
    }
  }

  const prices =
    findPriceCandidates(
      text
    );

  for (
    const price
    of prices
  ) {
    issues.push({
      code:
        "UNSOURCED_PRICE",

      severity:
        "error",

      value:
        price,
    });
  }

  const suspiciousClaims = [
    {
      pattern:
        /\bgaranti(?:e|es|s)?\b/i,

      code:
        "UNVERIFIED_GUARANTEE",
    },

    {
      pattern:
        /\bmeilleur(?:e|es|s)? prix\b/i,

      code:
        "UNVERIFIED_BEST_PRICE",
    },

    {
      pattern:
        /\bmoins cher(?:e|es|s)?\b/i,

      code:
        "UNVERIFIED_PRICE_CLAIM",
    },

    {
      pattern:
        /\bnuméro\s*1\b/i,

      code:
        "UNVERIFIED_NUMBER_ONE_CLAIM",
    },
  ];

  for (
    const rule
    of suspiciousClaims
  ) {
    if (
      rule.pattern.test(
        text
      )
    ) {
      issues.push({
        code:
          rule.code,

        severity:
          "warning",
      });
    }
  }

  return {
    safe:
      !issues.some(
        issue =>
          issue.severity ===
          "error"
      ),

    issues,

    detected: {
      phones,
      emails,
      prices,
    },
  };
}

module.exports = {
  factualSafetyCheck,
  findPhoneCandidates,
  findEmailCandidates,
  findPriceCandidates,
};
