"use strict";

function collectStrings(
  value,
  output =
    []
) {
  if (
    typeof value ===
    "string"
  ) {
    output.push(
      value
    );

    return output;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    for (
      const item
      of value
    ) {
      collectStrings(
        item,
        output
      );
    }

    return output;
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    for (
      const item
      of Object.values(
        value
      )
    ) {
      collectStrings(
        item,
        output
      );
    }
  }

  return output;
}

function flattenText(
  value
) {
  return collectStrings(
    value
  )
    .join(" ")
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function normalizeText(
  value
) {
  return String(
    value ||
    ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}

function words(
  value
) {
  const normalized =
    normalizeText(
      value
    );

  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .filter(
      Boolean
    );
}

function wordCount(
  value
) {
  return words(
    value
  ).length;
}

function containsNormalized(
  text,
  needle
) {
  const haystack =
    normalizeText(
      text
    );

  const target =
    normalizeText(
      needle
    );

  if (!target) {
    return false;
  }

  return haystack.includes(
    target
  );
}

module.exports = {
  collectStrings,
  flattenText,
  normalizeText,
  words,
  wordCount,
  containsNormalized,
};
