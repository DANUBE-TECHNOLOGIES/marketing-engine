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
  const slug =
    cleanText(value)
      .replace(/^\/+|\/+$/g, "");

  if (
    slug === "home" ||
    slug === "accueil"
  ) {
    return "";
  }

  return slug;
}

function truncateAtWord(
  value,
  limit
) {
  const text =
    cleanText(value);

  if (
    text.length <= limit
  ) {
    return text;
  }

  const fragment =
    text
      .slice(
        0,
        Math.max(
          0,
          limit - 1
        )
      )
      .trim();

  const lastSpace =
    fragment.lastIndexOf(" ");

  const truncated =
    lastSpace > 20
      ? fragment.slice(
          0,
          lastSpace
        )
      : fragment;

  return `${truncated}…`;
}

function pathForSlug(
  slug
) {
  const normalized =
    normalizeSlug(slug);

  return normalized
    ? `/${normalized}`
    : "/";
}

function pageLabel(
  page
) {
  return (
    cleanText(
      page.title
    ) ||
    cleanText(
      page.slug
    )
      .replace(
        /[-_]+/g,
        " "
      ) ||
    "Accueil"
  );
}

module.exports = {
  cleanText,
  normalizeSlug,
  pageLabel,
  pathForSlug,
  truncateAtWord,
};
