"use strict";

function cleanText(
  value,
  fallback = ""
) {
  return String(
    value ?? fallback
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(
  value
) {
  const normalized =
    cleanText(value)
      .replace(/^\/+|\/+$/g, "");

  if (
    normalized === "home" ||
    normalized === "accueil"
  ) {
    return "";
  }

  return normalized;
}

function normalizeBlockType(
  block
) {
  return cleanText(
    block?.type ||
    block?.blockType
  ).toLowerCase();
}

function unique(
  values
) {
  return [
    ...new Set(
      values
    ),
  ];
}

function determineBlueprint(
  agencyName
) {
  const normalized =
    cleanText(
      agencyName
    ).toLowerCase();

  if (
    normalized.includes(
      "tui"
    )
  ) {
    return "tui";
  }

  if (
    normalized.includes(
      "fram"
    )
  ) {
    return "fram";
  }

  return "mondescale";
}

function cityFromAgencyName(
  agencyName
) {
  const name =
    cleanText(
      agencyName
    );

  const withoutBrand =
    name
      .replace(
        /ambassade\s+fram\s*[-–—]?\s*/i,
        ""
      )
      .replace(
        /mondescale\s*/i,
        ""
      )
      .replace(
        /tui\s+store\s*/i,
        ""
      )
      .trim();

  return withoutBrand ||
    name;
}

module.exports = {
  cityFromAgencyName,
  cleanText,
  determineBlueprint,
  normalizeBlockType,
  normalizeSlug,
  unique,
};
