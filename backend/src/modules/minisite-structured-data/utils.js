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

function pagePath(
  slug
) {
  const normalized =
    normalizeSlug(slug);

  return normalized
    ? `/${normalized}`
    : "";
}

function siteUrl(
  publicOrigin,
  siteSlug
) {
  return [
    cleanText(publicOrigin)
      .replace(/\/+$/g, ""),
    "agence",
    cleanText(siteSlug)
      .replace(/^\/+|\/+$/g, ""),
  ]
    .filter(Boolean)
    .join("/");
}

function pageUrl(
  publicOrigin,
  siteSlug,
  slug
) {
  return (
    siteUrl(
      publicOrigin,
      siteSlug
    ) +
    pagePath(slug)
  );
}

function stableClone(
  value
) {
  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  if (
    Array.isArray(value)
  ) {
    return value.map(
      stableClone
    );
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map(
        (key) => [
          key,
          stableClone(
            value[key]
          ),
        ]
      )
  );
}

function removeEmpty(
  value
) {
  if (
    Array.isArray(value)
  ) {
    return value
      .map(
        removeEmpty
      )
      .filter(
        (item) =>
          item !== undefined &&
          item !== null
      );
  }

  if (
    value &&
    typeof value === "object"
  ) {
    return Object.fromEntries(
      Object.entries(value)
        .map(
          ([key, item]) => [
            key,
            removeEmpty(item),
          ]
        )
        .filter(
          ([, item]) => {
            if (
              item === undefined ||
              item === null ||
              item === ""
            ) {
              return false;
            }

            if (
              Array.isArray(item) &&
              item.length === 0
            ) {
              return false;
            }

            if (
              typeof item === "object" &&
              !Array.isArray(item) &&
              Object.keys(item).length === 0
            ) {
              return false;
            }

            return true;
          }
        )
    );
  }

  if (
    value === "" ||
    value === undefined
  ) {
    return undefined;
  }

  return value;
}

function normalizePhone(
  value
) {
  return cleanText(value)
    .replace(/[^\d+]/g, "");
}

function normalizeBlockType(
  block
) {
  return cleanText(
    block?.blockType ||
    block?.type
  ).toLowerCase();
}

module.exports = {
  cleanText,
  normalizeBlockType,
  normalizePhone,
  normalizeSlug,
  pagePath,
  pageUrl,
  removeEmpty,
  siteUrl,
  stableClone,
};
